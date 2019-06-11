/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import {
  Blame,
  Commit,
  Diff as NodeGitDiff,
  Error as NodeGitError,
  Object,
  Oid,
  Reference,
  Repository,
  Tree,
  TreeEntry,
} from '@elastic/nodegit';
import Boom from 'boom';
import LruCache from 'lru-cache';
import * as Path from 'path';
import * as fs from 'fs';

import { GitBlame } from '../common/git_blame';
import { CommitDiff, Diff, DiffKind } from '../common/git_diff';
import { FileTree, FileTreeItemType, RepositoryUri, sortFileTree } from '../model';
import { CommitInfo, ReferenceInfo, ReferenceType } from '../model/commit';
import { detectLanguage } from './utils/detect_language';

const HEAD = 'HEAD';
const REFS_HEADS = 'refs/heads/';
export const DEFAULT_TREE_CHILDREN_LIMIT = 50;

/**
 * do a nodegit operation and check the results. If it throws a not found error or returns null,
 * rethrow a Boom.notFound error.
 * @param func the nodegit operation
 * @param message the message pass to Boom.notFound error
 */
async function checkExists<R>(func: () => Promise<R>, message: string): Promise<R> {
  let result: R;
  try {
    result = await func();
  } catch (e) {
    if (e.errno === NodeGitError.CODE.ENOTFOUND) {
      throw Boom.notFound(message);
    } else {
      throw e;
    }
  }
  if (result == null) {
    throw Boom.notFound(message);
  }
  return result;
}

function entry2Tree(entry: TreeEntry): FileTree {
  let type: FileTreeItemType;
  switch (entry.filemode()) {
    case TreeEntry.FILEMODE.LINK:
      type = FileTreeItemType.Link;
      break;
    case TreeEntry.FILEMODE.COMMIT:
      type = FileTreeItemType.Submodule;
      break;
    case TreeEntry.FILEMODE.TREE:
      type = FileTreeItemType.Directory;
      break;
    case TreeEntry.FILEMODE.BLOB:
    case TreeEntry.FILEMODE.EXECUTABLE:
      type = FileTreeItemType.File;
      break;
    default:
      // @ts-ignore
      throw new Error('unreadable file');
  }
  return {
    name: entry.name(),
    path: entry.path(),
    sha1: entry.sha(),
    type,
  };
}

export class GitOperations {
  private REPO_LRU_CACHE_SIZE = 16;
  private REPO_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour;
  private repoRoot: string;
  private repoCache: LruCache<RepositoryUri, Repository>;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;

    const options = {
      max: this.REPO_LRU_CACHE_SIZE,
      maxAge: this.REPO_MAX_AGE_MS,
      dispose: (repoUri: RepositoryUri, repo: Repository) => {
        // Clean up the repository before disposing this repo out of the cache.
        repo.cleanup();
      },
    };
    this.repoCache = new LruCache(options);
  }

  public cleanRepo(uri: RepositoryUri) {
    if (this.repoCache.has(uri)) {
      this.repoCache.del(uri);
    }
  }

  public async cleanAllRepo() {
    this.repoCache.reset();
  }

  public async fileContent(uri: RepositoryUri, path: string, revision: string = 'master') {
    const commit = await this.getCommit(uri, revision);
    const entry: TreeEntry = await checkExists(
      () => commit.getEntry(path),
      `file ${uri}/${path} not found `
    );
    if (entry.isFile() || entry.filemode() === TreeEntry.FILEMODE.LINK) {
      return await entry.getBlob();
    } else {
      throw Boom.unsupportedMediaType(`${uri}/${path} is not a file.`);
    }
  }

  public async getCommit(uri: RepositoryUri, revision: string): Promise<Commit> {
    const repo = await this.openRepo(uri);
    if (revision.toUpperCase() === 'HEAD') {
      return await repo.getHeadCommit();
    }
    // branches and tags
    const refs = [`refs/remotes/origin/${revision}`, `refs/tags/${revision}`];
    const commit = await this.findCommitByRefs(repo, refs);
    if (commit === null) {
      return (await checkExists(
        () => this.findCommit(repo, revision),
        `revision or branch ${revision} not found in ${repo.path()}`
      )) as Commit;
    }
    return commit;
  }

  public async getDefaultBranch(uri: RepositoryUri): Promise<string> {
    const repo = await this.openRepo(uri);
    const ref = await repo.getReference(HEAD);
    const name = ref.name();
    if (name.startsWith(REFS_HEADS)) {
      return name.substr(REFS_HEADS.length);
    }
    return name;
  }

  public async getHeadRevision(uri: RepositoryUri): Promise<string> {
    const repo = await this.openRepo(uri);
    const commit = await repo.getHeadCommit();
    return commit.sha();
  }

  public async blame(uri: RepositoryUri, revision: string, path: string): Promise<GitBlame[]> {
    const repo = await this.openRepo(uri);
    const newestCommit = (await this.getCommit(uri, revision)).id();
    const blame = await Blame.file(repo, path, { newestCommit });
    const results: GitBlame[] = [];
    for (let i = 0; i < blame.getHunkCount(); i++) {
      const hunk = blame.getHunkByIndex(i);
      // @ts-ignore wrong definition in nodegit
      const commit = await repo.getCommit(hunk.finalCommitId());
      results.push({
        committer: {
          // @ts-ignore wrong definition in nodegit
          name: hunk.finalSignature().name(),
          // @ts-ignore wrong definition in nodegit
          email: hunk.finalSignature().email(),
        },
        // @ts-ignore wrong definition in nodegit
        startLine: hunk.finalStartLineNumber(),
        // @ts-ignore wrong definition in nodegit
        lines: hunk.linesInHunk(),
        commit: {
          id: commit.sha(),
          message: commit.message(),
          date: commit.date().toISOString(),
        },
      });
    }
    return results;
  }

  public async openRepo(uri: RepositoryUri): Promise<Repository> {
    if (this.repoCache.has(uri)) {
      const repo = this.repoCache.get(uri) as Repository;
      return Promise.resolve(repo);
    }

    const repoDir = Path.join(this.repoRoot, uri);
    this.checkPath(repoDir);
    const repo = await checkExists<Repository>(
      () => Repository.open(repoDir),
      `repo ${uri} not found`
    );
    this.repoCache.set(uri, repo);
    return Promise.resolve(repo);
  }

  private checkPath(path: string) {
    if (!fs.realpathSync(path).startsWith(fs.realpathSync(this.repoRoot))) {
      throw new Error('invalid path');
    }
  }
  public async countRepoFiles(uri: RepositoryUri, revision: string): Promise<number> {
    const commit = await this.getCommit(uri, revision);
    const tree = await commit.getTree();
    let count = 0;

    async function walk(t: Tree) {
      for (const e of t.entries()) {
        if (e.isFile() && e.filemode() !== TreeEntry.FILEMODE.LINK) {
          count++;
        } else if (e.isDirectory()) {
          const subFolder = await e.getTree();
          await walk(subFolder);
        } else {
          // ignore other files
        }
      }
    }

    await walk(tree);
    return count;
  }

  public async iterateRepo(
    uri: RepositoryUri,
    revision: string
  ): Promise<AsyncIterableIterator<FileTree>> {
    const commit = await this.getCommit(uri, revision);
    const tree = await commit.getTree();

    async function* walk(t: Tree): AsyncIterableIterator<FileTree> {
      for (const e of t.entries()) {
        if (e.isFile() && e.filemode() !== TreeEntry.FILEMODE.LINK) {
          const blob = await e.getBlob();
          // Ignore binary files
          if (!blob.isBinary()) {
            yield entry2Tree(e);
          }
        } else if (e.isDirectory()) {
          const subFolder = await e.getTree();
          await (yield* walk(subFolder));
        } else {
          // ignore other files
        }
      }
    }

    return await walk(tree);
  }

  /**
   * Return a fileTree structure by walking the repo file tree.
   * @param uri the repo uri
   * @param path the start path
   * @param revision the revision
   * @param skip pagination parameter, skip how many nodes in each children.
   * @param limit pagination parameter, limit the number of node's children.
   * @param resolveParents whether the return value should always start from root
   * @param childrenDepth how depth should the children walk.
   */
  public async fileTree(
    uri: RepositoryUri,
    path: string,
    revision: string = HEAD,
    skip: number = 0,
    limit: number = DEFAULT_TREE_CHILDREN_LIMIT,
    resolveParents: boolean = false,
    childrenDepth: number = 1,
    flatten: boolean = false
  ): Promise<FileTree> {
    const commit = await this.getCommit(uri, revision);
    const tree = await commit.getTree();
    if (path === '/') {
      path = '';
    }
    const getRoot = async () => {
      return await this.walkTree(
        {
          name: '',
          path: '',
          type: FileTreeItemType.Directory,
        },
        tree,
        [],
        skip,
        limit,
        childrenDepth,
        flatten
      );
    };
    if (path) {
      if (resolveParents) {
        return this.walkTree(
          await getRoot(),
          tree,
          path.split('/'),
          skip,
          limit,
          childrenDepth,
          flatten
        );
      } else {
        const entry = await checkExists(
          () => Promise.resolve(tree.getEntry(path)),
          `path ${path} does not exists.`
        );
        if (entry.isDirectory()) {
          const tree1 = await entry.getTree();
          return this.walkTree(entry2Tree(entry), tree1, [], skip, limit, childrenDepth, flatten);
        } else {
          return entry2Tree(entry);
        }
      }
    } else {
      return getRoot();
    }
  }

  public async getCommitDiff(uri: string, revision: string): Promise<CommitDiff> {
    const repo = await this.openRepo(uri);
    const commit = await this.getCommit(uri, revision);
    const diffs = await commit.getDiff();

    const commitDiff: CommitDiff = {
      commit: commitInfo(commit),
      additions: 0,
      deletions: 0,
      files: [],
    };
    for (const diff of diffs) {
      const patches = await diff.patches();
      for (const patch of patches) {
        const { total_deletions, total_additions } = patch.lineStats();
        commitDiff.additions += total_additions;
        commitDiff.deletions += total_deletions;
        if (patch.isAdded()) {
          const path = patch.newFile().path();
          const modifiedCode = await this.getModifiedCode(commit, path);
          const language = await detectLanguage(path, modifiedCode);
          commitDiff.files.push({
            language,
            path,
            modifiedCode,
            additions: total_additions,
            deletions: total_deletions,
            kind: DiffKind.ADDED,
          });
        } else if (patch.isDeleted()) {
          const path = patch.oldFile().path();
          const originCode = await this.getOriginCode(commit, repo, path);
          const language = await detectLanguage(path, originCode);
          commitDiff.files.push({
            language,
            path,
            originCode,
            kind: DiffKind.DELETED,
            additions: total_additions,
            deletions: total_deletions,
          });
        } else if (patch.isModified()) {
          const path = patch.newFile().path();
          const modifiedCode = await this.getModifiedCode(commit, path);
          const originPath = patch.oldFile().path();
          const originCode = await this.getOriginCode(commit, repo, originPath);
          const language = await detectLanguage(patch.newFile().path(), modifiedCode);
          commitDiff.files.push({
            language,
            path,
            originPath,
            originCode,
            modifiedCode,
            kind: DiffKind.MODIFIED,
            additions: total_additions,
            deletions: total_deletions,
          });
        } else if (patch.isRenamed()) {
          const path = patch.newFile().path();
          commitDiff.files.push({
            path,
            originPath: patch.oldFile().path(),
            kind: DiffKind.RENAMED,
            additions: total_additions,
            deletions: total_deletions,
          });
        }
      }
    }
    return commitDiff;
  }

  public async getDiff(uri: string, oldRevision: string, newRevision: string): Promise<Diff> {
    const repo = await this.openRepo(uri);
    const oldCommit = await this.getCommit(uri, oldRevision);
    const newCommit = await this.getCommit(uri, newRevision);
    const oldTree = await oldCommit.getTree();
    const newTree = await newCommit.getTree();

    const diff = await NodeGitDiff.treeToTree(repo, oldTree, newTree);

    const res: Diff = {
      additions: 0,
      deletions: 0,
      files: [],
    };
    const patches = await diff.patches();
    for (const patch of patches) {
      const { total_deletions, total_additions } = patch.lineStats();
      res.additions += total_additions;
      res.deletions += total_deletions;
      if (patch.isAdded()) {
        const path = patch.newFile().path();
        res.files.push({
          path,
          additions: total_additions,
          deletions: total_deletions,
          kind: DiffKind.ADDED,
        });
      } else if (patch.isDeleted()) {
        const path = patch.oldFile().path();
        res.files.push({
          path,
          kind: DiffKind.DELETED,
          additions: total_additions,
          deletions: total_deletions,
        });
      } else if (patch.isModified()) {
        const path = patch.newFile().path();
        const originPath = patch.oldFile().path();
        res.files.push({
          path,
          originPath,
          kind: DiffKind.MODIFIED,
          additions: total_additions,
          deletions: total_deletions,
        });
      } else if (patch.isRenamed()) {
        const path = patch.newFile().path();
        res.files.push({
          path,
          originPath: patch.oldFile().path(),
          kind: DiffKind.RENAMED,
          additions: total_additions,
          deletions: total_deletions,
        });
      }
    }
    return res;
  }

  private async getOriginCode(commit: Commit, repo: Repository, path: string) {
    for (const oid of commit.parents()) {
      const parentCommit = await repo.getCommit(oid);
      if (parentCommit) {
        const entry = await parentCommit.getEntry(path);
        if (entry) {
          return (await entry.getBlob()).content().toString('utf8');
        }
      }
    }
    return '';
  }

  private async getModifiedCode(commit: Commit, path: string) {
    const entry = await commit.getEntry(path);
    return (await entry.getBlob()).content().toString('utf8');
  }

  private async walkTree(
    fileTree: FileTree,
    tree: Tree,
    paths: string[],
    skip: number,
    limit: number,
    childrenDepth: number = 1,
    flatten: boolean = false
  ): Promise<FileTree> {
    const [path, ...rest] = paths;
    fileTree.childrenCount = tree.entryCount();
    if (!fileTree.children) {
      fileTree.children = [];
      for (const e of tree.entries().slice(skip, limit)) {
        const child = entry2Tree(e);
        fileTree.children.push(child);
        if (e.isDirectory()) {
          const childChildrenCount = (await e.getTree()).entryCount();
          if ((childChildrenCount === 1 && flatten) || childrenDepth > 1) {
            await this.walkTree(
              child,
              await e.getTree(),
              [],
              skip,
              limit,
              childrenDepth - 1,
              flatten
            );
          }
        }
      }
      fileTree.children.sort(sortFileTree);
    }
    if (path) {
      const entry = await checkExists(
        () => Promise.resolve(tree.getEntry(path)),
        `path ${fileTree.path}/${path} does not exists.`
      );
      let child = entry2Tree(entry);
      if (entry.isDirectory()) {
        child = await this.walkTree(
          child,
          await entry.getTree(),
          rest,
          skip,
          limit,
          childrenDepth,
          flatten
        );
      }
      const idx = fileTree.children.findIndex(c => c.name === entry.name());
      if (idx >= 0) {
        // replace the entry in children if found
        fileTree.children[idx] = child;
      } else {
        fileTree.children.push(child);
      }
    }

    return fileTree;
  }

  private async findCommit(repo: Repository, revision: string): Promise<Commit | null> {
    try {
      const obj = await Object.lookupPrefix(
        repo,
        Oid.fromString(revision),
        revision.length,
        Object.TYPE.COMMIT
      );
      if (obj) {
        return repo.getCommit(obj.id());
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  private async findCommitByRefs(repo: Repository, refs: string[]): Promise<Commit | null> {
    if (refs.length === 0) {
      return null;
    }
    const [ref, ...rest] = refs;
    try {
      return await repo.getReferenceCommit(ref);
    } catch (e) {
      if (e.errno === NodeGitError.CODE.ENOTFOUND) {
        return await this.findCommitByRefs(repo, rest);
      } else {
        throw e;
      }
    }
  }
}

export function commitInfo(commit: Commit): CommitInfo {
  return {
    updated: commit.date(),
    message: commit.message(),
    committer: commit.committer().name(),
    id: commit.sha().substr(0, 7),
    parents: commit.parents().map(oid => oid.toString().substring(0, 7)),
  };
}

export async function referenceInfo(ref: Reference): Promise<ReferenceInfo | null> {
  const repository = ref.owner();
  let commit: CommitInfo | undefined;
  try {
    const object = await ref.peel(Object.TYPE.COMMIT);
    commit = commitInfo(await repository.getCommit(object.id()));
  } catch {
    return null;
  }
  let type: ReferenceType;
  if (ref.isTag()) {
    type = ReferenceType.TAG;
  } else if (ref.isRemote()) {
    type = ReferenceType.REMOTE_BRANCH;
  } else if (ref.isBranch()) {
    type = ReferenceType.BRANCH;
  } else {
    type = ReferenceType.OTHER;
  }
  return {
    name: ref.shorthand(),
    reference: ref.name(),
    commit,
    type,
  };
}

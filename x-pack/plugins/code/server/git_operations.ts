/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Blame, Commit, Error, Object, Oid, Reference, Repository, Tree, TreeEntry } from 'nodegit';
import * as Path from 'path';
import { GitBlame } from '../common/git_blame';
import { CommitDiff, DiffKind } from '../common/git_diff';
import { FileTree, FileTreeItemType, RepositoryUri } from '../model';
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
    if (e.errno === Error.CODE.ENOTFOUND) {
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
  return {
    name: entry.name(),
    path: entry.path(),
    sha1: entry.sha(),
    type: entry.isDirectory()
      ? FileTreeItemType.Directory
      : entry.isSubmodule()
      ? FileTreeItemType.Submodule
      : FileTreeItemType.File,
  };
}

export class GitOperations {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  public async fileContent(uri: RepositoryUri, path: string, revision: string = 'master') {
    const repo = await this.openRepo(uri);
    const commit = await this.getCommit(repo, revision);
    const entry: TreeEntry = await checkExists(
      () => commit.getEntry(path),
      `file ${uri}/${path} not found `
    );
    if (entry.isFile()) {
      return await entry.getBlob();
    } else {
      throw Boom.unsupportedMediaType(`${uri}/${path} is not a file.`);
    }
  }

  public async getCommit(repo: Repository, revision: string): Promise<Commit> {
    if (revision.toUpperCase() === 'HEAD') {
      return await repo.getHeadCommit();
    }
    try {
      return await repo.getBranchCommit(revision);
    } catch (e) {
      if (e.errno === Error.CODE.ENOTFOUND) {
        return checkExists(
          () => this.findCommit(repo, revision),
          `revision or branch ${revision} not found in ${repo.path()}`
        );
      } else {
        throw e;
      }
    }
  }

  public async blame(uri: RepositoryUri, revision: string, path: string): Promise<GitBlame[]> {
    const repo = await this.openRepo(uri);
    const newestCommit = (await this.getCommit(repo, revision)).id();
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
    const repoDir = Path.join(this.repoRoot, uri);
    return checkExists<Repository>(() => Repository.open(repoDir), `repo ${uri} not found`);
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
    const repo = await this.openRepo(uri);
    const commit = await this.getCommit(repo, revision);
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
    const commit = await this.getCommit(repo, revision);
    const diffs = await commit.getDiff();

    const commitDiff: CommitDiff = {
      commit: {
        sha: commit.sha(),
        author: commit.author().name(),
        message: commit.message(),
        date: commit.date(),
      },
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
          const childChildrenCount = (await this.walkTree(
            { ...child },
            await e.getTree(),
            [],
            skip,
            limit,
            childrenDepth,
            flatten
          )).childrenCount;
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

  private async findCommit(repo: Repository, revision: string): Promise<Commit> {
    const obj = await Object.lookupPrefix(
      repo,
      Oid.fromString(revision),
      revision.length,
      Object.TYPE.COMMIT
    );
    if (obj) {
      return repo.getCommit(obj.id());
    }
    // @ts-ignore
    return null;
  }
}

export function commitInfo(commit: Commit): CommitInfo {
  return {
    updated: commit.date(),
    message: commit.message(),
    committer: commit.committer().name(),
    id: commit.sha().substr(0, 7),
  };
}

export async function referenceInfo(ref: Reference): Promise<ReferenceInfo> {
  const repository = ref.owner();
  const object = await ref.peel(Object.TYPE.COMMIT);
  const commit = await repository.getCommit(object.id());
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
    commit: commitInfo(commit),
    type,
  };
}

export async function getDefaultBranch(path: string): Promise<string> {
  const repo = await Repository.open(path);
  const ref = await repo.getReference(HEAD);
  const name = ref.name();
  if (name.startsWith(REFS_HEADS)) {
    return name.substr(REFS_HEADS.length);
  }
  return name;
}

export async function getHeadRevision(path: string): Promise<string> {
  const repo = await Repository.open(path);
  const commit = await repo.getHeadCommit();
  return commit.sha();
}

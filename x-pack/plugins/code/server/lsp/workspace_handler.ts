/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Commit,
  Error as GitError,
  Repository,
  Reset,
  TreeEntry,
  // @ts-ignore
  Worktree,
} from '@elastic/nodegit';
import Boom from 'boom';
import del from 'del';
import fs from 'fs';
import { delay } from 'lodash';
import mkdirp from 'mkdirp';
import path from 'path';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { Hover, Location, TextDocumentPositionParams } from 'vscode-languageserver';

import { DetailSymbolInformation, Full } from '@elastic/lsp-extension';

import { RepositoryUtils } from '../../common/repository_utils';
import { parseLspUrl } from '../../common/uri_util';
import { LspRequest, WorkerReservedProgress } from '../../model';
import { getDefaultBranch, GitOperations } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryObjectClient } from '../search';
import { LoggerFactory } from '../utils/log_factory';

export const MAX_RESULT_COUNT = 20;

export class WorkspaceHandler {
  private git: GitOperations;
  private revisionMap: { [uri: string]: string } = {};
  private log: Logger;
  private readonly objectClient: RepositoryObjectClient | undefined = undefined;

  constructor(
    readonly repoPath: string,
    private readonly workspacePath: string,
    private readonly client: EsClient,
    loggerFactory: LoggerFactory
  ) {
    this.git = new GitOperations(repoPath);
    this.log = loggerFactory.getLogger(['LSP', 'workspace']);
    if (this.client) {
      this.objectClient = new RepositoryObjectClient(this.client);
    }
  }

  /**
   * open workspace for repositoryUri, update it from bare repository if necessary.
   * @param repositoryUri the uri of bare repository.
   * @param revision
   */
  public async openWorkspace(repositoryUri: string, revision: string) {
    // Try get repository clone status with 3 retries at maximum.
    const tryGetGitStatus = async (retryCount: number) => {
      let gitStatus;
      try {
        gitStatus = await this.objectClient!.getRepositoryGitStatus(repositoryUri);
      } catch (error) {
        throw Boom.internal(`checkout workspace on an unknown status repository`);
      }

      if (
        !RepositoryUtils.hasFullyCloned(gitStatus.cloneProgress) &&
        gitStatus.progress < WorkerReservedProgress.COMPLETED
      ) {
        if (retryCount < 3) {
          this.log.debug(`Check repository ${repositoryUri} clone status at trial ${retryCount}`);
          return delay(tryGetGitStatus, 3000, retryCount + 1);
        } else {
          throw Boom.internal(`repository has not been fully cloned yet.`);
        }
      }
    };
    if (this.objectClient) {
      await tryGetGitStatus(0);
    }

    const bareRepo = await this.git.openRepo(repositoryUri);
    const targetCommit = await this.git.getCommit(bareRepo, revision);
    const defaultBranch = await getDefaultBranch(bareRepo.path());
    if (revision !== defaultBranch) {
      await this.checkCommit(bareRepo, targetCommit);
      revision = defaultBranch;
    }
    let workspaceRepo: Repository;
    if (await this.workspaceExists(repositoryUri, revision)) {
      workspaceRepo = await this.updateWorkspace(repositoryUri, revision, targetCommit);
    } else {
      workspaceRepo = await this.cloneWorkspace(bareRepo, repositoryUri, revision);
    }

    const workspaceHeadCommit = await workspaceRepo.getHeadCommit();
    if (workspaceHeadCommit.sha() !== targetCommit.sha()) {
      const commit = await workspaceRepo.getCommit(targetCommit.sha());
      this.log.info(`checkout ${workspaceRepo.workdir()} to commit ${targetCommit.sha()}`);
      // @ts-ignore
      const result = await Reset.reset(workspaceRepo, commit, Reset.TYPE.HARD, {});
      if (result !== undefined && result !== GitError.CODE.OK) {
        throw Boom.internal(`checkout workspace to commit ${targetCommit.sha()} failed.`);
      }
    }
    this.setWorkspaceRevision(workspaceRepo, workspaceHeadCommit);
    return { workspaceRepo, workspaceRevision: workspaceHeadCommit.sha().substring(0, 7) };
  }

  public async listWorkspaceFolders(repoUri: string) {
    const workspaceDir = await this.workspaceDir(repoUri);
    const isDir = (source: string) => fs.lstatSync(source).isDirectory();
    return fs
      .readdirSync(workspaceDir)
      .map(name => path.join(workspaceDir, name))
      .filter(isDir);
  }

  public async clearWorkspace(repoUri: string, revision?: string) {
    const workspaceDir = await this.workspaceDir(repoUri);
    if (revision) {
      await del([await this.revisionDir(repoUri, revision)], { force: true });
    } else {
      await del([workspaceDir], { force: true });
    }
  }

  public async handleRequest(request: LspRequest): Promise<void> {
    const { method, params } = request;
    switch (method) {
      case 'textDocument/edefinition':
      case 'textDocument/definition':
      case 'textDocument/hover':
      case 'textDocument/references':
      case 'textDocument/documentSymbol':
      case 'textDocument/full': {
        const payload: TextDocumentPositionParams = params;
        const { filePath, workspacePath, workspaceRevision } = await this.resolveUri(
          params.textDocument.uri
        );
        if (filePath) {
          request.documentUri = payload.textDocument.uri;
          payload.textDocument.uri = request.resolvedFilePath = filePath;
          request.workspacePath = workspacePath;
          request.workspaceRevision = workspaceRevision;
        }
        break;
      }
      default:
      // do nothing
    }
  }

  public handleResponse(request: LspRequest, response: ResponseMessage): ResponseMessage {
    const { method } = request;
    switch (method) {
      case 'textDocument/hover': {
        const result = response.result as Hover;
        this.handleHoverContents(result);
        return response;
      }
      case 'textDocument/edefinition': {
        let result = response.result;
        if (result) {
          if (!Array.isArray(result)) {
            response.result = result = [result];
          }
          for (const def of result) {
            this.convertLocation(def.location);
          }
        }
        return response;
      }
      case 'textDocument/definition': {
        const result = response.result;
        if (result) {
          if (Array.isArray(result)) {
            (result as Location[]).forEach(location => this.convertLocation(location));
          } else {
            this.convertLocation(result);
          }
        }
        return response;
      }
      case 'textDocument/full': {
        // unify the result of full as a array.
        const result = Array.isArray(response.result)
          ? (response.result as Full[])
          : [response.result as Full];
        for (const full of result) {
          if (full.symbols) {
            for (const symbol of full.symbols) {
              this.convertLocation(symbol.symbolInformation.location);

              if (symbol.contents !== null || symbol.contents !== undefined) {
                this.handleHoverContents(symbol);
              }
            }
          }
          if (full.references) {
            for (const reference of full.references) {
              this.convertLocation(reference.location);
              if (reference.target.location) {
                this.convertLocation(reference.target.location);
              }
            }
          }
        }
        response.result = result;
        return response;
      }
      case 'textDocument/references': {
        if (response.result) {
          const locations = (response.result as Location[]).slice(0, MAX_RESULT_COUNT);
          for (const location of locations) {
            this.convertLocation(location);
          }
          response.result = locations;
        }
        return response;
      }
      case 'textDocument/documentSymbol': {
        if (response.result) {
          for (const symbol of response.result) {
            this.convertLocation(symbol.location);
          }
        }
        return response;
      }
      default:
        return response;
    }
  }

  private handleHoverContents(result: Hover | DetailSymbolInformation) {
    if (!Array.isArray(result.contents)) {
      if (typeof result.contents === 'string') {
        result.contents = [{ language: '', value: result.contents }];
      } else {
        result.contents = [result.contents as { language: string; value: string }];
      }
    } else {
      result.contents = Array.from(result.contents).map(c => {
        if (typeof c === 'string') {
          return { language: '', value: c };
        } else {
          return c;
        }
      });
    }
  }

  private parseLocation(location: Location) {
    const uri = location.uri;
    const prefix = path.sep === '\\' ? 'file:///' : 'file://';
    if (uri && uri.startsWith(prefix)) {
      const locationPath = fs.realpathSync(decodeURIComponent(uri.substring(prefix.length)));
      const workspacePath = fs.realpathSync(decodeURIComponent(this.workspacePath));
      if (locationPath.startsWith(workspacePath)) {
        let relativePath = path.relative(workspacePath, locationPath);
        if (path.sep === '\\') {
          relativePath = relativePath.replace(/\\/gi, '/');
        }
        const regex = /^(.*?\/.*?\/.*?)\/(__.*?\/)?([^_]+?)\/(.*)$/;
        const m = relativePath.match(regex);
        if (m) {
          const repoUri = m[1];
          const revision = m[3];
          const gitRevision = this.revisionMap[`${repoUri}/${revision}`] || revision;
          const file = m[4];
          return { repoUri, revision: gitRevision, file };
        }
      }
      // @ts-ignore
      throw new Error("path in response doesn't not starts with workspace path");
    }
    return null;
  }

  private convertLocation(location: Location) {
    if (location) {
      const parsedLocation = this.parseLocation(location);
      if (parsedLocation) {
        const { repoUri, revision, file } = parsedLocation;
        location.uri = `git://${repoUri}/blob/${revision}/${file}`;
      }
      return parsedLocation;
    }
  }

  private fileUrl(str: string) {
    let pathName = str.replace(/\\/g, '/');
    // Windows drive letter must be prefixed with a slash
    if (pathName[0] !== '/') {
      pathName = '/' + pathName;
    }
    return 'file://' + pathName;
  }

  /**
   * convert a git uri to absolute file path, checkout code into workspace
   * @param uri the uri
   */
  private async resolveUri(uri: string) {
    if (uri.startsWith('git://')) {
      const { repoUri, file, revision } = parseLspUrl(uri)!;
      const { workspaceRepo, workspaceRevision } = await this.openWorkspace(repoUri, revision);
      if (file) {
        const isValidPath = await this.checkFile(workspaceRepo, file);
        if (!isValidPath) {
          throw new Error('invalid file path in requests.');
        }
      }
      return {
        workspacePath: workspaceRepo.workdir(),
        filePath: this.fileUrl(path.resolve(workspaceRepo.workdir(), file || '/')),
        uri,
        workspaceRevision,
      };
    } else {
      return {
        workspacePath: undefined,
        workspaceRevision: undefined,
        filePath: undefined,
        uri,
      };
    }
  }

  private async checkCommit(repository: Repository, commit: Commit) {
    // we only support headCommit now.
    const headCommit = await repository.getHeadCommit();
    if (headCommit.sha() !== commit.sha()) {
      throw Boom.badRequest(`revision must be master.`);
    }
  }

  private async workspaceExists(repositoryUri: string, revision: string) {
    const workspaceDir = await this.revisionDir(repositoryUri, revision);
    return fs.existsSync(workspaceDir);
  }

  private async revisionDir(repositoryUri: string, revision: string) {
    return path.join(await this.workspaceDir(repositoryUri), revision);
  }

  private async workspaceDir(repoUri: string) {
    const randomStr =
      this.objectClient && (await this.objectClient.getRepositoryRandomStr(repoUri));
    const base = path.join(this.workspacePath, repoUri);
    if (randomStr) {
      return path.join(base, `__${randomStr}`);
    } else {
      return base;
    }
  }

  private workspaceWorktreeBranchName(repoName: string): string {
    return `workspace-${repoName}`;
  }

  private async updateWorkspace(
    repositoryUri: string,
    revision: string,
    targetCommit: Commit
  ): Promise<Repository> {
    const workspaceDir = await this.revisionDir(repositoryUri, revision);
    const workspaceRepo = await Repository.open(workspaceDir);
    const workspaceHead = await workspaceRepo.getHeadCommit();
    if (workspaceHead.sha() !== targetCommit.sha()) {
      const commit = await workspaceRepo.getCommit(targetCommit.sha());
      this.log.info(`Checkout workspace ${workspaceDir} to ${targetCommit.sha()}`);
      // @ts-ignore
      const result = await Reset.reset(workspaceRepo, commit, Reset.TYPE.HARD, {});
      if (result !== undefined && result !== GitError.CODE.OK) {
        throw Boom.internal(`Reset workspace to commit ${targetCommit.sha()} failed.`);
      }
    }
    return workspaceRepo;
  }

  private async cloneWorkspace(
    bareRepo: Repository,
    repositoryUri: string,
    revision: string
  ): Promise<Repository> {
    const workspaceDir = await this.revisionDir(repositoryUri, revision);
    this.log.info(`Create workspace ${workspaceDir} from url ${bareRepo.path()}`);
    const parentDir = path.dirname(workspaceDir);
    const mainBranchName = path.basename(workspaceDir);
    // on windows, git clone will failed if parent folder is not exists;
    await new Promise((resolve, reject) =>
      mkdirp(parentDir, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      })
    );
    // Create the worktree and open it as Repository.
    const wt = await Worktree.add(
      bareRepo,
      this.workspaceWorktreeBranchName(mainBranchName),
      workspaceDir,
      {}
    );
    // @ts-ignore
    return await Repository.openFromWorktree(wt);
  }

  private setWorkspaceRevision(workspaceRepo: Repository, headCommit: Commit) {
    const workspaceRelativePath = path.relative(this.workspacePath, workspaceRepo.workdir());
    this.revisionMap[workspaceRelativePath] = headCommit.sha().substring(0, 7);
  }

  /**
   * check whether the file path specify in the request is valid. The file path must:
   *  1. exists in git repo
   *  2. is a valid file or dir, can't be a link or submodule
   *
   * @param workspaceRepo
   * @param filePath
   */
  private async checkFile(workspaceRepo: Repository, filePath: string) {
    const headCommit = await workspaceRepo.getHeadCommit();
    try {
      const entry = await headCommit.getEntry(filePath);
      switch (entry.filemode()) {
        case TreeEntry.FILEMODE.TREE:
        case TreeEntry.FILEMODE.BLOB:
        case TreeEntry.FILEMODE.EXECUTABLE:
          return true;
        default:
          return false;
      }
    } catch (e) {
      // filePath may not exists
      return false;
    }
  }
}

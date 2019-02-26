/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import del from 'del';
import fs from 'fs';
import mkdirp from 'mkdirp';
import Git from 'nodegit';
import path from 'path';
import { RepositoryUtils } from '../common/repository_utils';
import {
  CloneProgress,
  CloneWorkerResult,
  DeleteWorkerResult,
  Repository,
  UpdateWorkerResult,
} from '../model';
import { Logger } from './log';

export type CloneProgressHandler = (progress: number, cloneProgress?: CloneProgress) => void;

// This is the service for any kind of repository handling, e.g. clone, update, delete, etc.
export class RepositoryService {
  constructor(private readonly repoVolPath: string, private log: Logger) {}

  public async clone(repo: Repository, handler?: CloneProgressHandler): Promise<CloneWorkerResult> {
    if (!repo) {
      throw new Error(`Invalid repository.`);
    } else {
      const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, repo.uri);
      if (fs.existsSync(localPath)) {
        this.log.info(`Repository exist in local path. Do update instead of clone.`);
        try {
          // Do update instead of clone if the local repo exists.
          const updateRes = await this.update(repo.uri);
          return {
            uri: repo.uri,
            repo: {
              ...repo,
              defaultBranch: updateRes.branch,
              revision: updateRes.revision,
            },
          };
        } catch (error) {
          // If failed to update the current git repo living in the disk, clean up the local git repo and
          // move on with the clone.
          await this.remove(repo.uri);
        }
      } else {
        const parentDir = path.dirname(localPath);
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
      }

      // Go head with the actual clone.
      try {
        const gitRepo = await Git.Clone.clone(repo.url, localPath, {
          bare: 1,
          fetchOpts: {
            callbacks: {
              transferProgress: {
                throttle: 50, // Make the progress update less frequent.
                callback: (stats: any) => {
                  const progress =
                    (100 * (stats.receivedObjects() + stats.indexedObjects())) /
                    (stats.totalObjects() * 2);
                  const cloneProgress = {
                    isCloned: false,
                    receivedObjects: stats.receivedObjects(),
                    indexedObjects: stats.indexedObjects(),
                    totalObjects: stats.totalObjects(),
                    localObjects: stats.localObjects(),
                    totalDeltas: stats.totalDeltas(),
                    indexedDeltas: stats.indexedDeltas(),
                    receivedBytes: stats.receivedBytes(),
                  };
                  if (handler) {
                    handler(progress, cloneProgress);
                  }
                },
              } as any,
            },
          },
        });
        const headCommit = await gitRepo.getHeadCommit();
        const headRevision = headCommit.sha();
        const currentBranch = await gitRepo.getCurrentBranch();
        const currentBranchName = currentBranch.shorthand();
        this.log.info(
          `Clone repository from ${
            repo.url
          } done with head revision ${headRevision} and default branch ${currentBranchName}`
        );
        return {
          uri: repo.uri,
          repo: {
            ...repo,
            defaultBranch: currentBranchName,
            revision: headRevision,
          },
        };
      } catch (error) {
        const msg = `Clone repository from ${repo.url} error.`;
        this.log.error(msg);
        this.log.error(error);
        throw new Error(msg);
      }
    }
  }

  public async remove(uri: string): Promise<DeleteWorkerResult> {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    try {
      // For now, just `rm -rf`
      await del([localPath], { force: true });
      this.log.info(`Remove local repository ${uri} done.`);
      return {
        uri,
        res: true,
      };
    } catch (error) {
      this.log.error(`Remove local repository ${uri} error: ${error}.`);
      throw error;
    }
  }

  public async update(uri: string): Promise<UpdateWorkerResult> {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    try {
      const repo = await Git.Repository.open(localPath);
      await repo.fetchAll();
      // TODO(mengwei): deal with the case when the default branch has changed.
      const currentBranch = await repo.getCurrentBranch();
      const currentBranchName = currentBranch.shorthand();
      await repo.mergeBranches(
        currentBranchName,
        `origin/${currentBranchName}`,
        Git.Signature.default(repo),
        Git.Merge.PREFERENCE.FASTFORWARD_ONLY
      );
      const headCommit = await repo.getHeadCommit();
      this.log.debug(`Update repository to revision ${headCommit.sha()}`);
      return {
        uri,
        branch: currentBranchName,
        revision: headCommit.sha(),
      };
    } catch (error) {
      const msg = `update repository ${uri} error: ${error}`;
      this.log.error(msg);
      throw new Error(msg);
    }
  }
}

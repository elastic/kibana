/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CloneWorkerProgress,
  Repository,
  RepositoryConfig,
  RepositoryUri,
  WorkerProgress,
} from '../../model';
import {
  RepositoryConfigReservedField,
  RepositoryDeleteStatusReservedField,
  RepositoryGitStatusReservedField,
  RepositoryIndexName,
  RepositoryIndexNamePrefix,
  RepositoryLspIndexStatusReservedField,
  RepositoryRandomPathReservedField,
  RepositoryReservedField,
} from '../indexer/schema';
import { EsClient } from '../lib/esqueue';

/*
 * This RepositoryObjectClient is dedicated to manipulate resository related objects
 * stored in ES.
 */
export class RepositoryObjectClient {
  constructor(protected readonly esClient: EsClient) {}

  public async getRepositoryGitStatus(repoUri: RepositoryUri): Promise<CloneWorkerProgress> {
    return await this.getRepositoryObject(repoUri, RepositoryGitStatusReservedField);
  }

  public async getRepositoryLspIndexStatus(repoUri: RepositoryUri): Promise<WorkerProgress> {
    return await this.getRepositoryObject(repoUri, RepositoryLspIndexStatusReservedField);
  }

  public async getRepositoryDeleteStatus(repoUri: RepositoryUri): Promise<WorkerProgress> {
    return await this.getRepositoryObject(repoUri, RepositoryDeleteStatusReservedField);
  }

  public async getRepositoryConfig(repoUri: RepositoryUri): Promise<RepositoryConfig> {
    return await this.getRepositoryObject(repoUri, RepositoryConfigReservedField);
  }

  public async getRepository(repoUri: RepositoryUri): Promise<Repository> {
    return await this.getRepositoryObject(repoUri, RepositoryReservedField);
  }

  public async getRepositoryRandomStr(repoUri: RepositoryUri): Promise<string> {
    return await this.getRepositoryObject(repoUri, RepositoryRandomPathReservedField);
  }

  public async getAllRepositories(): Promise<Repository[]> {
    const res = await this.esClient.search({
      index: `${RepositoryIndexNamePrefix}*`,
      body: {
        query: {
          exists: {
            field: RepositoryReservedField,
          },
        },
      },
      from: 0,
      size: 10000,
    });
    const hits: any[] = res.hits.hits;
    const repos: Repository[] = hits.map(hit => {
      const repo: Repository = hit._source[RepositoryReservedField];
      return repo;
    });
    return repos;
  }

  public async setRepositoryGitStatus(repoUri: RepositoryUri, gitStatus: CloneWorkerProgress) {
    return await this.setRepositoryObject(repoUri, RepositoryGitStatusReservedField, gitStatus);
  }

  public async setRepositoryLspIndexStatus(repoUri: RepositoryUri, indexStatus: WorkerProgress) {
    return await this.setRepositoryObject(
      repoUri,
      RepositoryLspIndexStatusReservedField,
      indexStatus
    );
  }

  public async setRepositoryDeleteStatus(repoUri: RepositoryUri, deleteStatus: WorkerProgress) {
    return await this.setRepositoryObject(
      repoUri,
      RepositoryDeleteStatusReservedField,
      deleteStatus
    );
  }

  public async setRepositoryConfig(repoUri: RepositoryUri, config: RepositoryConfig) {
    return await this.setRepositoryObject(repoUri, RepositoryConfigReservedField, config);
  }

  public async setRepositoryRandomStr(repoUri: RepositoryUri, randomStr: string) {
    return await this.setRepositoryObject(repoUri, RepositoryRandomPathReservedField, randomStr);
  }

  public async setRepository(repoUri: RepositoryUri, repo: Repository) {
    return await this.setRepositoryObject(repoUri, RepositoryReservedField, repo);
  }

  public async updateRepositoryGitStatus(repoUri: RepositoryUri, obj: any) {
    return await this.updateRepositoryObject(repoUri, RepositoryGitStatusReservedField, obj);
  }

  public async updateRepositoryLspIndexStatus(repoUri: RepositoryUri, obj: any) {
    return await this.updateRepositoryObject(repoUri, RepositoryLspIndexStatusReservedField, obj);
  }

  public async updateRepositoryDeleteStatus(repoUri: RepositoryUri, obj: any) {
    return await this.updateRepositoryObject(repoUri, RepositoryDeleteStatusReservedField, obj);
  }

  public async updateRepository(repoUri: RepositoryUri, obj: any) {
    return await this.updateRepositoryObject(repoUri, RepositoryReservedField, obj);
  }

  private async getRepositoryObject(
    repoUri: RepositoryUri,
    reservedFieldName: string
  ): Promise<any> {
    const res = await this.esClient.get({
      index: RepositoryIndexName(repoUri),
      id: this.getRepositoryObjectId(reservedFieldName),
    });
    return res._source[reservedFieldName];
  }

  private async setRepositoryObject(repoUri: RepositoryUri, reservedFieldName: string, obj: any) {
    return await this.esClient.index({
      index: RepositoryIndexName(repoUri),
      id: this.getRepositoryObjectId(reservedFieldName),
      refresh: 'true',
      body: JSON.stringify({
        [reservedFieldName]: obj,
      }),
    });
  }

  private async updateRepositoryObject(
    repoUri: RepositoryUri,
    reservedFieldName: string,
    obj: any
  ) {
    return await this.esClient.update({
      index: RepositoryIndexName(repoUri),
      id: this.getRepositoryObjectId(reservedFieldName),
      refresh: 'true',
      body: JSON.stringify({
        doc: {
          [reservedFieldName]: obj,
        },
      }),
    });
  }

  private getRepositoryObjectId(reservedFieldName: string): string {
    return reservedFieldName;
  }
}

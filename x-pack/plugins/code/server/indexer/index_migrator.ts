/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getDocumentIndexCreationRequest,
  getReferenceIndexCreationRequest,
  getSymbolIndexCreationRequest,
  IndexCreationRequest,
  IndexVersionController,
} from '.';
import { Repository } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryObjectClient } from '../search';
import pkg from './schema/version.json';

export class IndexMigrator {
  private version: number;

  constructor(private readonly client: EsClient, private readonly log: Logger) {
    this.version = Number(pkg.codeIndexVersion);
  }

  public async migrateIndex(oldIndexName: string, request: IndexCreationRequest) {
    const body = {
      settings: request.settings,
      mappings: {
        // Apply the index version in the reserved _meta field of the index.
        _meta: {
          version: this.version,
        },
        dynamic_templates: [
          {
            fieldDefaultNotAnalyzed: {
              match: '*',
              mapping: {
                index: false,
                norms: false,
              },
            },
          },
        ],
        properties: request.schema,
      },
    };

    const newIndexName = `${request.index}-${this.version}`;

    try {
      try {
        // Create the new index first with the version as the index suffix number.
        await this.client.indices.create({
          index: newIndexName,
          body,
        });
      } catch (error) {
        this.log.error(`Create new index ${newIndexName} for index migration error.`);
        this.log.error(error);
        throw error;
      }

      try {
        // Issue the reindex request for import the data from the old index.
        await this.client.reindex({
          body: {
            source: {
              index: oldIndexName,
            },
            dest: {
              index: newIndexName,
            },
          },
        });
      } catch (error) {
        this.log.error(
          `Migrate data from ${oldIndexName} to ${newIndexName} for index migration error.`
        );
        this.log.error(error);
        throw error;
      }

      try {
        // Update the alias
        await this.client.indices.updateAliases({
          body: {
            actions: [
              {
                remove: {
                  index: oldIndexName,
                  alias: request.index,
                },
              },
              {
                add: {
                  index: newIndexName,
                  alias: request.index,
                },
              },
            ],
          },
        });
      } catch (error) {
        this.log.error(`Update the index alias for ${newIndexName} error.`);
        this.log.error(error);
        throw error;
      }

      try {
        // Delete the old index
        await this.client.indices.delete({ index: oldIndexName });
      } catch (error) {
        this.log.error(`Clean up the old index ${oldIndexName} error.`);
        this.log.error(error);
        // This won't affect serving, so do not throw the error anymore.
      }
    } catch (error) {
      this.log.error(`Index upgrade/migration to version ${this.version} failed.`);
      this.log.error(error);
    }
  }
}

export const tryMigrateIndices = async (client: EsClient, log: Logger) => {
  log.info('Check the versions of Code indices...');
  const repoObjectClient = new RepositoryObjectClient(client);
  const repos: Repository[] = await repoObjectClient.getAllRepositories();

  const migrationPromises = [];
  for (const repo of repos) {
    const docIndexVersionController = new IndexVersionController(client, log);
    const docCreationReq = getDocumentIndexCreationRequest(repo.uri);
    migrationPromises.push(docIndexVersionController.tryUpgrade(docCreationReq));

    const symbolIndexVersionController = new IndexVersionController(client, log);
    const symbolCreationReq = getSymbolIndexCreationRequest(repo.uri);
    migrationPromises.push(symbolIndexVersionController.tryUpgrade(symbolCreationReq));

    const refIndexVersionController = new IndexVersionController(client, log);
    const refCreationReq = getReferenceIndexCreationRequest(repo.uri);
    migrationPromises.push(refIndexVersionController.tryUpgrade(refCreationReq));
  }
  return Promise.all(migrationPromises);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import type { BulkRequest, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  RuleMigrationResource,
  RuleMigrationResourceType,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { StoredRuleMigrationResource } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

const BULK_MAX_SIZE = 500 as const;

export class RuleMigrationsDataResourcesClient extends RuleMigrationsDataBaseClient {
  /** Creates or updates an array of resources granularly */
  public async createOrUpdate(resources: RuleMigrationResource[]): Promise<void> {
    const index = await this.indexNamePromise;

    let resourcesSlice: RuleMigrationResource[];
    while ((resourcesSlice = resources.splice(0, BULK_MAX_SIZE)).length > 0) {
      // Create the ids for all the resources
      const allIds: string[] = [];
      const resourcesToStore = resourcesSlice.map<RuleMigrationResource & { _id: string }>(
        (resource) => {
          const id = this.createId(resource);
          allIds.push(id);
          return { ...resource, _id: id };
        }
      );

      // Get the existing resources by id
      const query = { ids: { values: allIds } };
      const existingResources: StoredRuleMigrationResource[] = await this.esClient
        .search<RuleMigrationResource>({ index, query })
        .then(this.processResponseHits.bind(this))
        .catch((error) => {
          this.logger.error(`Error searching resources: ${error.message}`);
          throw error;
        });

      // Map the ids to obtain the backing index to update the existing ones
      const toUpdateIds = Object.fromEntries(
        existingResources.map(({ _id, _index }) => [_id, _index])
      );

      const updateFields = { updated_by: this.username, updated_at: new Date().toISOString() };
      const createFields = { ...updateFields, '@timestamp': new Date().toISOString() };

      // Create the bulk operations
      const operations: BulkRequest['operations'] = [];
      resourcesToStore.forEach(({ _id, ...resource }) => {
        const _index = toUpdateIds[_id]; // updates need the specific backing index
        if (_index) {
          operations.push({ update: { _id, _index } }, { doc: { ...resource, ...updateFields } });
        } else {
          operations.push({ create: { _index: index, _id } }, { ...resource, ...createFields });
        }
      });

      await this.esClient.bulk({ operations }).catch((error) => {
        this.logger.error(`Error creating or updating resources: ${error.message}`);
        throw error;
      });
    }
  }

  public async get(
    migrationId: string,
    type?: RuleMigrationResourceType,
    names?: string[]
  ): Promise<StoredRuleMigrationResource[]> {
    const index = await this.indexNamePromise;

    const filter: QueryDslQueryContainer[] = [{ term: { migration_id: migrationId } }];
    if (type) {
      filter.push({ term: { type } });
    }
    if (names) {
      filter.push({ terms: { name: names } });
    }
    const query = { bool: { filter } };

    return this.esClient
      .search<RuleMigrationResource>({ index, query })
      .then(this.processResponseHits.bind(this))
      .catch((error) => {
        this.logger.error(`Error searching resources: ${error.message}`);
        throw error;
      });
  }

  private createId(resource: RuleMigrationResource): string {
    const key = `${resource.migration_id}-${resource.type}-${resource.name}`;
    return sha256.create().update(key).hex();
  }
}

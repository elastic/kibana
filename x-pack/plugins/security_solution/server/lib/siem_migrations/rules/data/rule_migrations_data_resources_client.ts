/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import type { RuleMigrationResource } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { StoredRuleMigrationResource } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

export class RuleMigrationsDataResourcesClient extends RuleMigrationsDataBaseClient {
  public async upsert(resources: RuleMigrationResource[]): Promise<void> {
    let resourcesSlice: RuleMigrationResource[];
    while ((resourcesSlice = resources.splice(0, 500)).length) {
      await this.createOrUpdate(resourcesSlice);
    }
  }

  /** Indexes or updates an array of resources */
  async createOrUpdate(resources: RuleMigrationResource[]): Promise<void> {
    const index = await this.indexNamePromise;
    const resourcesToStore = resources.map<RuleMigrationResource & { _id: string }>((resource) => ({
      ...resource,
      _id: this.getId(resource),
    }));

    const query = { ids: { values: resourcesToStore.map(({ _id }) => _id) } };
    const existingResources: StoredRuleMigrationResource[] = await this.esClient
      .search<RuleMigrationResource>({ index, query })
      .then((response) => this.processResponse(response))
      .catch((error) => {
        // Ignore index_not_found_exception, data stream will be created on indexing
        if (!error.message.startsWith('index_not_found_exception')) {
          this.logger.error(`Error searching resources by id: ${error.message}`);
          throw error;
        }
        return [];
      });

    // Get the ids and indices of the resources that could not be created due to version conflict
    const toUpdateIds = Object.fromEntries(
      existingResources.map(({ _id, _index }) => [_id, _index])
    );

    const updatedFields = {
      updated_by: this.currentUser.username,
      updated_at: new Date().toISOString(),
    };

    const operations: BulkRequest['operations'] = [];
    resourcesToStore.forEach(({ _id, ...resource }) => {
      const updateIndex = toUpdateIds[_id];
      if (updateIndex) {
        operations.push(
          { update: { _id, _index: updateIndex } },
          { doc: { ...resource, ...updatedFields } }
        );
      } else {
        operations.push(
          { create: { _index: index, _id } },
          { ...resource, ...updatedFields, '@timestamp': new Date().toISOString() }
        );
      }
    });

    await this.esClient.bulk({ operations }).catch((error) => {
      this.logger.error(`Error upserting resources: ${error.message}`);
      throw error;
    });
  }

  private getId(resource: RuleMigrationResource): string {
    const key = `${resource.migration_id}-${resource.type}-${resource.name}`;
    return sha256.create().update(key).hex();
  }
}

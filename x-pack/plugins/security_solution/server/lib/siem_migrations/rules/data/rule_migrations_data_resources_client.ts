/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  RuleMigrationResource,
  RuleMigrationResourceType,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { StoredRuleMigrationResource } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

export type CreateRuleMigrationResourceInput = Omit<RuleMigrationResource, 'id'>;

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed.
 */
const BULK_MAX_SIZE = 500 as const;

export class RuleMigrationsDataResourcesClient extends RuleMigrationsDataBaseClient {
  public async upsert(resources: CreateRuleMigrationResourceInput[]): Promise<void> {
    const index = await this.getIndexName();

    let resourcesSlice: CreateRuleMigrationResourceInput[];

    const createdAt = new Date().toISOString();
    while ((resourcesSlice = resources.splice(0, BULK_MAX_SIZE)).length > 0) {
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: resourcesSlice.flatMap((resource) => [
            { update: { _id: this.createId(resource), _index: index } },
            {
              doc: {
                ...resource,
                '@timestamp': createdAt,
                updated_by: this.username,
                updated_at: createdAt,
              },
              doc_as_upsert: true,
            },
          ]),
        })
        .catch((error) => {
          this.logger.error(`Error upsert resources: ${error.message}`);
          throw error;
        });
    }
  }

  public async get(
    migrationId: string,
    type?: RuleMigrationResourceType,
    names?: string[]
  ): Promise<StoredRuleMigrationResource[]> {
    const index = await this.getIndexName();

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

  private createId(resource: CreateRuleMigrationResourceInput): string {
    const key = `${resource.migration_id}-${resource.type}-${resource.name}`;
    return sha256.create().update(key).hex();
  }
}

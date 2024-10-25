/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import assert from 'assert';
import type {
  AggregationsFilterAggregate,
  AggregationsMaxAggregate,
  QueryDslQueryContainer,
  SearchHit,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { StoredRuleMigration } from '../types';
import { SiemMigrationsStatus } from '../../../../../common/siem_migrations/constants';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';

export type CreateRuleMigrationInput = Omit<RuleMigration, '@timestamp' | 'status' | 'created_by'>;
export interface RuleMigrationStats {
  total: number;
  pending: number;
  processing: number;
  finished: number;
  failed: number;
  lastUpdatedAt: string | undefined;
}

export class RuleMigrationsDataClient {
  constructor(
    private dataStreamNamePromise: Promise<string>,
    private currentUser: AuthenticatedUser,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  /** Indexes an array of rule migrations to be processed */
  async create(ruleMigrations: CreateRuleMigrationInput[]): Promise<void> {
    const index = await this.dataStreamNamePromise;
    await this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: ruleMigrations.flatMap((ruleMigration) => [
          { create: { _index: index } },
          {
            ...ruleMigration,
            '@timestamp': new Date().toISOString(),
            status: SiemMigrationsStatus.PENDING,
            created_by: this.currentUser.username,
          },
        ]),
      })
      .catch((error) => {
        this.logger.error(`Error creating rule migrations: ${error.message}`);
        throw error;
      });
  }

  /** Retrieves "pending" rule migrations with the provided id and updates their status to "processing" */
  async takePending(migrationId: string, size: number): Promise<StoredRuleMigration[]> {
    const index = await this.dataStreamNamePromise;
    const query = this.getFilterQuery(migrationId, SiemMigrationsStatus.PENDING);

    const storedRuleMigrations = await this.esClient
      .search<RuleMigration>({ index, query, sort: '_doc', size })
      .catch((error) => {
        this.logger.error(`Error searching for rule migrations: ${error.message}`);
        throw error;
      })
      .then((response) =>
        this.processHits(response.hits.hits, { status: SiemMigrationsStatus.PROCESSING })
      );

    await this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: storedRuleMigrations.flatMap(({ _id, _index, status }) => [
          { update: { _id, _index } },
          {
            doc: {
              status,
              updated_by: this.currentUser.username,
              updated_at: new Date().toISOString(),
            },
          },
        ]),
      })
      .catch((error) => {
        this.logger.error(
          `Error updating for rule migrations status to processing: ${error.message}`
        );
        throw error;
      });

    return storedRuleMigrations;
  }

  /** Updates one rule migration with the provided data and sets the status to "finished" */
  async saveFinished({ _id, _index, ...ruleMigration }: StoredRuleMigration): Promise<void> {
    const doc = {
      ...ruleMigration,
      status: SiemMigrationsStatus.FINISHED,
      updated_by: this.currentUser.username,
      updated_at: new Date().toISOString(),
    };
    await this.esClient
      .update({ index: _index, id: _id, doc, refresh: 'wait_for' })
      .catch((error) => {
        this.logger.error(`Error updating rule migration status to finished: ${error.message}`);
        throw error;
      });
  }

  /** Updates all the rule migration with the provided id with status "processing" back to "pending" */
  async releaseProcessing(migrationId: string): Promise<void> {
    const index = await this.dataStreamNamePromise;
    const query = this.getFilterQuery(migrationId, SiemMigrationsStatus.PROCESSING);
    const script = { source: `ctx._source['status'] = '${SiemMigrationsStatus.PENDING}'` };
    await this.esClient.updateByQuery({ index, query, script, refresh: false }).catch((error) => {
      this.logger.error(`Error releasing rule migrations status to pending: ${error.message}`);
      throw error;
    });
  }

  /** Retrieves the stats for the rule migrations with the provided id */
  async getStats(migrationId: string): Promise<RuleMigrationStats> {
    const index = await this.dataStreamNamePromise;
    const query = this.getFilterQuery(migrationId);
    const aggregations = {
      pending: { filter: { term: { status: SiemMigrationsStatus.PENDING } } },
      processing: { filter: { term: { status: SiemMigrationsStatus.PROCESSING } } },
      finished: { filter: { term: { status: SiemMigrationsStatus.FINISHED } } },
      failed: { filter: { term: { status: SiemMigrationsStatus.ERROR } } },
      lastUpdatedAt: { max: { field: 'updated_at' } },
    };
    const result = await this.esClient
      .search<
        unknown,
        {
          pending: AggregationsFilterAggregate;
          processing: AggregationsFilterAggregate;
          finished: AggregationsFilterAggregate;
          failed: AggregationsFilterAggregate;
          lastUpdatedAt: AggregationsMaxAggregate;
        }
      >({ index, query, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting rule migrations stats: ${error.message}`);
        throw error;
      });

    const { pending, processing, finished, lastUpdatedAt, failed } = result.aggregations ?? {};
    return {
      total: this.getTotalHits(result),
      pending: pending?.doc_count ?? 0,
      processing: processing?.doc_count ?? 0,
      finished: finished?.doc_count ?? 0,
      failed: failed?.doc_count ?? 0,
      lastUpdatedAt: lastUpdatedAt?.value_as_string,
    };
  }

  private getFilterQuery(
    migrationId: string,
    status?: SiemMigrationsStatus
  ): QueryDslQueryContainer {
    const filter: QueryDslQueryContainer[] = [{ term: { migration_id: migrationId } }];
    if (status) {
      filter.push({ term: { status } });
    }
    return { bool: { filter } };
  }

  private processHits(
    hits: Array<SearchHit<RuleMigration>>,
    override: Partial<RuleMigration> = {}
  ): StoredRuleMigration[] {
    return hits.map(({ _id, _index, _source }) => {
      assert(_id, 'RuleMigration document should have _id');
      assert(_source, 'RuleMigration document should have _source');
      return { ..._source, ...override, _id, _index };
    });
  }

  private getTotalHits(response: SearchResponse) {
    return typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? 0;
  }
}

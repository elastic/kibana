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
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  QueryDslQueryContainer,
  SearchHit,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { StoredRuleMigration } from '../types';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import type {
  RuleMigration,
  RuleMigrationTaskStats,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';

export type CreateRuleMigrationInput = Omit<RuleMigration, '@timestamp' | 'status' | 'created_by'>;
export type RuleMigrationDataStats = Omit<RuleMigrationTaskStats, 'status'>;
export type RuleMigrationAllDataStats = Array<RuleMigrationDataStats & { migration_id: string }>;

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
            status: SiemMigrationStatus.PENDING,
            created_by: this.currentUser.username,
          },
        ]),
      })
      .catch((error) => {
        this.logger.error(`Error creating rule migrations: ${error.message}`);
        throw error;
      });
  }

  /** Retrieves an array of rule documents of a specific migrations */
  async getRules(migrationId: string): Promise<StoredRuleMigration[]> {
    const index = await this.dataStreamNamePromise;
    const query = this.getFilterQuery(migrationId);

    const storedRuleMigrations = await this.esClient
      .search<RuleMigration>({ index, query, sort: '_doc' })
      .catch((error) => {
        this.logger.error(`Error searching getting rule migrations: ${error.message}`);
        throw error;
      })
      .then((response) => this.processHits(response.hits.hits));
    return storedRuleMigrations;
  }

  /**
   * Retrieves `pending` rule migrations with the provided id and updates their status to `processing`.
   * This operation is not atomic at migration level:
   * - Multiple tasks can process different migrations simultaneously.
   * - Multiple tasks should not process the same migration simultaneously.
   */
  async takePending(migrationId: string, size: number): Promise<StoredRuleMigration[]> {
    const index = await this.dataStreamNamePromise;
    const query = this.getFilterQuery(migrationId, SiemMigrationStatus.PENDING);

    const storedRuleMigrations = await this.esClient
      .search<RuleMigration>({ index, query, sort: '_doc', size })
      .catch((error) => {
        this.logger.error(`Error searching for rule migrations: ${error.message}`);
        throw error;
      })
      .then((response) =>
        this.processHits(response.hits.hits, { status: SiemMigrationStatus.PROCESSING })
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

  /** Updates one rule migration with the provided data and sets the status to `completed` */
  async saveFinished({ _id, _index, ...ruleMigration }: StoredRuleMigration): Promise<void> {
    const doc = {
      ...ruleMigration,
      status: SiemMigrationStatus.COMPLETED,
      updated_by: this.currentUser.username,
      updated_at: new Date().toISOString(),
    };
    await this.esClient
      .update({ index: _index, id: _id, doc, refresh: 'wait_for' })
      .catch((error) => {
        this.logger.error(`Error updating rule migration status to completed: ${error.message}`);
        throw error;
      });
  }

  /** Updates one rule migration with the provided data and sets the status to `failed` */
  async saveError({ _id, _index, ...ruleMigration }: StoredRuleMigration): Promise<void> {
    const doc = {
      ...ruleMigration,
      status: SiemMigrationStatus.FAILED,
      updated_by: this.currentUser.username,
      updated_at: new Date().toISOString(),
    };
    await this.esClient
      .update({ index: _index, id: _id, doc, refresh: 'wait_for' })
      .catch((error) => {
        this.logger.error(`Error updating rule migration status to completed: ${error.message}`);
        throw error;
      });
  }

  /** Updates all the rule migration with the provided id with status `processing` back to `pending` */
  async releaseProcessing(migrationId: string): Promise<void> {
    const index = await this.dataStreamNamePromise;
    const query = this.getFilterQuery(migrationId, SiemMigrationStatus.PROCESSING);
    const script = { source: `ctx._source['status'] = '${SiemMigrationStatus.PENDING}'` };
    await this.esClient.updateByQuery({ index, query, script, refresh: false }).catch((error) => {
      this.logger.error(`Error releasing rule migrations status to pending: ${error.message}`);
      throw error;
    });
  }

  /** Updates all the rule migration with the provided id with status `processing` or `failed` back to `pending` */
  async releaseProcessable(migrationId: string): Promise<void> {
    const index = await this.dataStreamNamePromise;
    const query = this.getFilterQuery(migrationId, [
      SiemMigrationStatus.PROCESSING,
      SiemMigrationStatus.FAILED,
    ]);
    const script = { source: `ctx._source['status'] = '${SiemMigrationStatus.PENDING}'` };
    await this.esClient.updateByQuery({ index, query, script, refresh: true }).catch((error) => {
      this.logger.error(`Error releasing rule migrations status to pending: ${error.message}`);
      throw error;
    });
  }

  /** Retrieves the stats for the rule migrations with the provided id */
  async getStats(migrationId: string): Promise<RuleMigrationDataStats> {
    const index = await this.dataStreamNamePromise;
    const query = this.getFilterQuery(migrationId);
    const aggregations = {
      pending: { filter: { term: { status: SiemMigrationStatus.PENDING } } },
      processing: { filter: { term: { status: SiemMigrationStatus.PROCESSING } } },
      completed: { filter: { term: { status: SiemMigrationStatus.COMPLETED } } },
      failed: { filter: { term: { status: SiemMigrationStatus.FAILED } } },
      lastUpdatedAt: { max: { field: 'updated_at' } },
    };
    const result = await this.esClient
      .search({ index, query, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting rule migrations stats: ${error.message}`);
        throw error;
      });

    const { pending, processing, completed, lastUpdatedAt, failed } = result.aggregations ?? {};
    return {
      rules: {
        total: this.getTotalHits(result),
        pending: (pending as AggregationsFilterAggregate)?.doc_count ?? 0,
        processing: (processing as AggregationsFilterAggregate)?.doc_count ?? 0,
        completed: (completed as AggregationsFilterAggregate)?.doc_count ?? 0,
        failed: (failed as AggregationsFilterAggregate)?.doc_count ?? 0,
      },
      last_updated_at: (lastUpdatedAt as AggregationsMaxAggregate)?.value_as_string,
    };
  }

  /** Retrieves the stats for all the rule migrations aggregated by migration id */
  async getAllStats(): Promise<RuleMigrationAllDataStats> {
    const index = await this.dataStreamNamePromise;
    const aggregations = {
      migrationIds: {
        terms: { field: 'migration_id' },
        aggregations: {
          pending: { filter: { term: { status: SiemMigrationStatus.PENDING } } },
          processing: { filter: { term: { status: SiemMigrationStatus.PROCESSING } } },
          completed: { filter: { term: { status: SiemMigrationStatus.COMPLETED } } },
          failed: { filter: { term: { status: SiemMigrationStatus.FAILED } } },
          lastUpdatedAt: { max: { field: 'updated_at' } },
        },
      },
    };
    const result = await this.esClient
      .search({ index, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting all rule migrations stats: ${error.message}`);
        throw error;
      });

    const migrationsAgg = result.aggregations?.migrationIds as AggregationsStringTermsAggregate;
    const buckets = (migrationsAgg?.buckets as AggregationsStringTermsBucket[]) ?? [];
    return buckets.map((bucket) => ({
      migration_id: bucket.key,
      rules: {
        total: bucket.doc_count,
        pending: bucket.pending?.doc_count ?? 0,
        processing: bucket.processing?.doc_count ?? 0,
        completed: bucket.completed?.doc_count ?? 0,
        failed: bucket.failed?.doc_count ?? 0,
      },
      last_updated_at: bucket.lastUpdatedAt?.value_as_string,
    }));
  }

  private getFilterQuery(
    migrationId: string,
    status?: SiemMigrationStatus | SiemMigrationStatus[]
  ): QueryDslQueryContainer {
    const filter: QueryDslQueryContainer[] = [{ term: { migration_id: migrationId } }];
    if (status) {
      if (Array.isArray(status)) {
        filter.push({ terms: { status } });
      } else {
        filter.push({ term: { status } });
      }
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

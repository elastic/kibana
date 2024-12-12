/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsFilterAggregate,
  AggregationsMaxAggregate,
  AggregationsMinAggregate,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { StoredRuleMigration } from '../types';
import {
  SiemMigrationRuleTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import type {
  ElasticRule,
  RuleMigration,
  RuleMigrationTaskStats,
  RuleMigrationTranslationStats,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

export type CreateRuleMigrationInput = Omit<
  RuleMigration,
  '@timestamp' | 'id' | 'status' | 'created_by'
>;
export type UpdateRuleMigrationInput = { elastic_rule?: Partial<ElasticRule> } & Pick<
  RuleMigration,
  'id' | 'translation_result' | 'comments'
>;
export type RuleMigrationDataStats = Omit<RuleMigrationTaskStats, 'status'>;
export type RuleMigrationAllDataStats = RuleMigrationDataStats[];

export interface RuleMigrationFilterOptions {
  migrationId: string;
  status?: SiemMigrationStatus | SiemMigrationStatus[];
  ids?: string[];
  installable?: boolean;
  searchTerm?: string;
}

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed.
 */
const BULK_MAX_SIZE = 500 as const;

const getInstallableConditions = (): QueryDslQueryContainer[] => {
  return [
    { term: { translation_result: SiemMigrationRuleTranslationResult.FULL } },
    {
      nested: {
        path: 'elastic_rule',
        query: {
          bool: { must_not: { exists: { field: 'elastic_rule.id' } } },
        },
      },
    },
  ];
};

export class RuleMigrationsDataRulesClient extends RuleMigrationsDataBaseClient {
  /** Indexes an array of rule migrations to be processed */
  async create(ruleMigrations: CreateRuleMigrationInput[]): Promise<void> {
    const index = await this.getIndexName();

    let ruleMigrationsSlice: CreateRuleMigrationInput[];
    const createdAt = new Date().toISOString();
    while ((ruleMigrationsSlice = ruleMigrations.splice(0, BULK_MAX_SIZE)).length) {
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: ruleMigrationsSlice.flatMap((ruleMigration) => [
            { create: { _index: index } },
            {
              ...ruleMigration,
              '@timestamp': createdAt,
              status: SiemMigrationStatus.PENDING,
              created_by: this.username,
              updated_by: this.username,
              updated_at: createdAt,
            },
          ]),
        })
        .catch((error) => {
          this.logger.error(`Error creating rule migrations: ${error.message}`);
          throw error;
        });
    }
  }

  /** Updates an array of rule migrations to be processed */
  async update(ruleMigrations: UpdateRuleMigrationInput[]): Promise<void> {
    const index = await this.getIndexName();

    let ruleMigrationsSlice: UpdateRuleMigrationInput[];
    const updatedAt = new Date().toISOString();
    while ((ruleMigrationsSlice = ruleMigrations.splice(0, BULK_MAX_SIZE)).length) {
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: ruleMigrationsSlice.flatMap((ruleMigration) => {
            const { id, ...rest } = ruleMigration;
            return [
              { update: { _index: index, _id: id } },
              {
                doc: {
                  ...rest,
                  updated_by: this.username,
                  updated_at: updatedAt,
                },
              },
            ];
          }),
        })
        .catch((error) => {
          this.logger.error(`Error updating rule migrations: ${error.message}`);
          throw error;
        });
    }
  }

  /** Retrieves an array of rule documents of a specific migrations */
  async get(
    filters: RuleMigrationFilterOptions,
    from?: number,
    size?: number
  ): Promise<{ total: number; data: StoredRuleMigration[] }> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery(filters);

    const result = await this.esClient
      .search<RuleMigration>({ index, query, sort: '_doc', from, size })
      .catch((error) => {
        this.logger.error(`Error searching rule migrations: ${error.message}`);
        throw error;
      });
    return {
      total: this.getTotalHits(result),
      data: this.processResponseHits(result),
    };
  }

  /**
   * Retrieves `pending` rule migrations with the provided id and updates their status to `processing`.
   * This operation is not atomic at migration level:
   * - Multiple tasks can process different migrations simultaneously.
   * - Multiple tasks should not process the same migration simultaneously.
   */
  async takePending(migrationId: string, size: number): Promise<StoredRuleMigration[]> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery({ migrationId, status: SiemMigrationStatus.PENDING });

    const storedRuleMigrations = await this.esClient
      .search<RuleMigration>({ index, query, sort: '_doc', size })
      .then((response) =>
        this.processResponseHits(response, { status: SiemMigrationStatus.PROCESSING })
      )
      .catch((error) => {
        this.logger.error(`Error searching rule migrations: ${error.message}`);
        throw error;
      });

    await this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: storedRuleMigrations.flatMap(({ id, status }) => [
          { update: { _id: id, _index: index } },
          {
            doc: { status, updated_by: this.username, updated_at: new Date().toISOString() },
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
  async saveCompleted({ id, ...ruleMigration }: StoredRuleMigration): Promise<void> {
    const index = await this.getIndexName();
    const doc = {
      ...ruleMigration,
      status: SiemMigrationStatus.COMPLETED,
      updated_by: this.username,
      updated_at: new Date().toISOString(),
    };
    await this.esClient.update({ index, id, doc, refresh: 'wait_for' }).catch((error) => {
      this.logger.error(`Error updating rule migration status to completed: ${error.message}`);
      throw error;
    });
  }

  /** Updates one rule migration with the provided data and sets the status to `failed` */
  async saveError({ id, ...ruleMigration }: StoredRuleMigration): Promise<void> {
    const index = await this.getIndexName();
    const doc = {
      ...ruleMigration,
      status: SiemMigrationStatus.FAILED,
      updated_by: this.username,
      updated_at: new Date().toISOString(),
    };
    await this.esClient.update({ index, id, doc, refresh: 'wait_for' }).catch((error) => {
      this.logger.error(`Error updating rule migration status to failed: ${error.message}`);
      throw error;
    });
  }

  /** Updates all the rule migration with the provided id with status `processing` back to `pending` */
  async releaseProcessing(migrationId: string): Promise<void> {
    return this.updateStatus(
      migrationId,
      SiemMigrationStatus.PROCESSING,
      SiemMigrationStatus.PENDING
    );
  }

  /** Updates all the rule migration with the provided id and with status `statusToQuery` to `statusToUpdate` */
  async updateStatus(
    migrationId: string,
    statusToQuery: SiemMigrationStatus | SiemMigrationStatus[] | undefined,
    statusToUpdate: SiemMigrationStatus,
    { refresh = false }: { refresh?: boolean } = {}
  ): Promise<void> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery({ migrationId, status: statusToQuery });
    const script = { source: `ctx._source['status'] = '${statusToUpdate}'` };
    await this.esClient.updateByQuery({ index, query, script, refresh }).catch((error) => {
      this.logger.error(`Error updating rule migrations status: ${error.message}`);
      throw error;
    });
  }

  /** Retrieves the translation stats for the rule migrations with the provided id */
  async getTranslationStats(migrationId: string): Promise<RuleMigrationTranslationStats> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery({ migrationId });

    const aggregations = {
      prebuilt: {
        filter: {
          nested: {
            path: 'elastic_rule',
            query: { exists: { field: 'elastic_rule.prebuilt_rule_id' } },
          },
        },
      },
      installable: {
        filter: {
          bool: {
            must: getInstallableConditions(),
          },
        },
      },
    };
    const result = await this.esClient
      .search({ index, query, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting rule migrations stats: ${error.message}`);
        throw error;
      });

    const bucket = result.aggregations ?? {};
    const total = this.getTotalHits(result);
    const prebuilt = (bucket.prebuilt as AggregationsFilterAggregate)?.doc_count ?? 0;
    return {
      id: migrationId,
      rules: {
        total,
        prebuilt,
        custom: total - prebuilt,
        installable: (bucket.installable as AggregationsFilterAggregate)?.doc_count ?? 0,
      },
    };
  }

  /** Retrieves the stats for the rule migrations with the provided id */
  async getStats(migrationId: string): Promise<RuleMigrationDataStats> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery({ migrationId });
    const aggregations = {
      pending: { filter: { term: { status: SiemMigrationStatus.PENDING } } },
      processing: { filter: { term: { status: SiemMigrationStatus.PROCESSING } } },
      completed: { filter: { term: { status: SiemMigrationStatus.COMPLETED } } },
      failed: { filter: { term: { status: SiemMigrationStatus.FAILED } } },
      createdAt: { min: { field: '@timestamp' } },
      lastUpdatedAt: { max: { field: 'updated_at' } },
    };
    const result = await this.esClient
      .search({ index, query, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting rule migrations stats: ${error.message}`);
        throw error;
      });

    const bucket = result.aggregations ?? {};
    return {
      id: migrationId,
      rules: {
        total: this.getTotalHits(result),
        pending: (bucket.pending as AggregationsFilterAggregate)?.doc_count ?? 0,
        processing: (bucket.processing as AggregationsFilterAggregate)?.doc_count ?? 0,
        completed: (bucket.completed as AggregationsFilterAggregate)?.doc_count ?? 0,
        failed: (bucket.failed as AggregationsFilterAggregate)?.doc_count ?? 0,
      },
      created_at: (bucket.createdAt as AggregationsMinAggregate)?.value_as_string ?? '',
      last_updated_at: (bucket.lastUpdatedAt as AggregationsMaxAggregate)?.value_as_string ?? '',
    };
  }

  /** Retrieves the stats for all the rule migrations aggregated by migration id, in creation order */
  async getAllStats(): Promise<RuleMigrationAllDataStats> {
    const index = await this.getIndexName();
    const aggregations: { migrationIds: AggregationsAggregationContainer } = {
      migrationIds: {
        terms: { field: 'migration_id', order: { createdAt: 'asc' } },
        aggregations: {
          pending: { filter: { term: { status: SiemMigrationStatus.PENDING } } },
          processing: { filter: { term: { status: SiemMigrationStatus.PROCESSING } } },
          completed: { filter: { term: { status: SiemMigrationStatus.COMPLETED } } },
          failed: { filter: { term: { status: SiemMigrationStatus.FAILED } } },
          createdAt: { min: { field: '@timestamp' } },
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
      id: bucket.key,
      rules: {
        total: bucket.doc_count,
        pending: bucket.pending?.doc_count ?? 0,
        processing: bucket.processing?.doc_count ?? 0,
        completed: bucket.completed?.doc_count ?? 0,
        failed: bucket.failed?.doc_count ?? 0,
      },
      created_at: bucket.createdAt?.value_as_string,
      last_updated_at: bucket.lastUpdatedAt?.value_as_string,
    }));
  }

  private getFilterQuery({
    migrationId,
    status,
    ids,
    installable,
    searchTerm,
  }: RuleMigrationFilterOptions): QueryDslQueryContainer {
    const filter: QueryDslQueryContainer[] = [{ term: { migration_id: migrationId } }];
    if (status) {
      if (Array.isArray(status)) {
        filter.push({ terms: { status } });
      } else {
        filter.push({ term: { status } });
      }
    }
    if (ids) {
      filter.push({ terms: { _id: ids } });
    }
    if (installable) {
      filter.push(...getInstallableConditions());
    }
    if (searchTerm?.length) {
      filter.push({
        nested: {
          path: 'elastic_rule',
          query: { match: { 'elastic_rule.title': searchTerm } },
        },
      });
    }
    return { bool: { filter } };
  }
}

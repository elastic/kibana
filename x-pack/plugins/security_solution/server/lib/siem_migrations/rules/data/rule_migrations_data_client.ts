/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  RuleMigration,
  RuleMigrationTaskStats,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import { RuleMigrationsDataResourcesClient } from './rule_migrations_data_resources_client';

export type CreateRuleMigrationInput = Omit<RuleMigration, '@timestamp' | 'status' | 'created_by'>;
export type RuleMigrationDataStats = Omit<RuleMigrationTaskStats, 'status'>;
export type RuleMigrationAllDataStats = Array<RuleMigrationDataStats & { migration_id: string }>;

export class RuleMigrationsDataClient {
  public readonly rules: RuleMigrationsDataRulesClient;
  public readonly resources: RuleMigrationsDataResourcesClient;

  constructor(
    indexNamePromises: Record<'rules' | 'resources', Promise<string>>,
    username: string,
    esClient: ElasticsearchClient,
    logger: Logger
  ) {
    this.rules = new RuleMigrationsDataRulesClient(
      indexNamePromises.rules,
      username,
      esClient,
      logger
    );
    this.resources = new RuleMigrationsDataResourcesClient(
      indexNamePromises.resources,
      username,
      esClient,
      logger
    );
  }
}

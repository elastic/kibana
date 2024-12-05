/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RuleMigrationResourceType } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { getRuleResourceIdentifier } from '../../../../../common/siem_migrations/rules/resources';
import { RuleMigrationsDataIntegrationsClient } from './rule_migrations_data_integrations_client';
import { RuleMigrationsDataResourcesClient } from './rule_migrations_data_resources_client';
import { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import type { AdapterId } from './rule_migrations_data_service';

export type IndexNameProvider = () => Promise<string>;
export type IndexNameProviders = Record<AdapterId, IndexNameProvider>;

export class RuleMigrationsDataClient {
  public readonly rules: RuleMigrationsDataRulesClient;
  public readonly resources: RuleMigrationsDataResourcesClient;
  public readonly integrations: RuleMigrationsDataIntegrationsClient;

  constructor(
    indexNameProviders: IndexNameProviders,
    username: string,
    esClient: ElasticsearchClient,
    logger: Logger
  ) {
    this.rules = new RuleMigrationsDataRulesClient(
      indexNameProviders.rules,
      username,
      esClient,
      logger
    );
    this.resources = new RuleMigrationsDataResourcesClient(
      indexNameProviders.resources,
      username,
      esClient,
      logger
    );
    this.integrations = new RuleMigrationsDataIntegrationsClient(
      indexNameProviders.integrations,
      username,
      esClient,
      logger
    );
  }

  public async getMissingResources(
    migrationId: string
  ): Promise<Record<RuleMigrationResourceType, string[]>> {
    const missing: Record<RuleMigrationResourceType, Set<string>> = {
      macro: new Set<string>(),
      list: new Set<string>(),
    };

    const { data } = await this.rules.get(migrationId);
    // This assumes all rules in the migration have the same vendor
    const identifyRuleResources = getRuleResourceIdentifier(data[0].original_rule);

    // Identify all resources in the rules
    for (const rule of data) {
      const identifiedResources = identifyRuleResources(rule.original_rule.query);
      for (const type of ['macro', 'list'] as const) {
        for (const resource of identifiedResources[type]) {
          missing[type].add(resource);
        }
      }
    }

    // Identify all resources in the existing macros
    const existingMacroResources = await this.resources.get(migrationId, 'macro');
    for (const macro of existingMacroResources) {
      const nestedResourcesIdentified = identifyRuleResources(macro.content);
      for (const type of ['macro', 'list'] as const) {
        for (const resource of nestedResourcesIdentified[type]) {
          missing[type].add(resource);
        }
      }
    }

    // Exclude existing macros
    for (const resource of existingMacroResources) {
      missing.macro.delete(resource.name);
    }

    // Exclude existing lists
    const existingListResources = await this.resources.get(migrationId, 'list');
    for (const list of existingListResources) {
      missing.list.delete(list.name);
    }

    return {
      macro: Array.from(missing.macro),
      list: Array.from(missing.list),
    };
  }
}

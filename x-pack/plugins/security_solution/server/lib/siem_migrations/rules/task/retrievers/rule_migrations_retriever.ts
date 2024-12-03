/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';
import { IntegrationRetriever } from './integration_retriever';
import { PrebuiltRulesRetriever } from './prebuilt_rules_retriever';
import { RuleResourceRetriever } from './rule_resource_retriever';

export class RuleMigrationsRetriever {
  public readonly resources: RuleResourceRetriever;
  public readonly integrations: IntegrationRetriever;
  public readonly prebuiltRules: PrebuiltRulesRetriever;

  constructor(dataClient: RuleMigrationsDataClient, migrationId: string) {
    this.resources = new RuleResourceRetriever(migrationId, dataClient);
    this.integrations = new IntegrationRetriever(dataClient);
    this.prebuiltRules = new PrebuiltRulesRetriever(dataClient);
  }
}

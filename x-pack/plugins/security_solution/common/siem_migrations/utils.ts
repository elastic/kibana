/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigration } from './model/rule_migration.gen';

export const canInstallMigrationRule = (migrationRule: Partial<RuleMigration>) => {
  return (
    migrationRule.elastic_rule?.prebuilt_rule_id || migrationRule.translation_result === 'full'
  );
};

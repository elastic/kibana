/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { MigrateRules } from '../..';
import type { SanitizedRule } from '../../types';

const MIGRATION_CONCURRENCY = 5;

interface MigrateExecutor {
  rules: SanitizedRule[];
  executor?: MigrateRules;
}

/**
 * runs concurrently migrations for rules in batches based on their rule type
 * 1. collects rules by rule types in batches
 * 2. runs in parallel migrateRules hook for each rule type using pMap
 * As migrateRules takes multiple rules as an argument, it allows to avoid single request for each rule
 */
export const migrateRulesHook: MigrateRules = async ({ rules }, context) => {
  const ruleTypeMap = new Map<string, MigrateExecutor>();
  rules.forEach((rule) => {
    const ruleType = context.ruleTypeRegistry.get(rule.alertTypeId);
    const ruleTypeId = ruleType?.id || 'unknown';
    if (ruleTypeMap.has(ruleTypeId)) {
      ruleTypeMap.get(ruleTypeId)?.rules.push(rule);
    } else {
      ruleTypeMap.set(ruleTypeId, { executor: ruleType?.migrateRules, rules: [rule] });
    }
  });

  const migrated = await pMap(
    Array.from(ruleTypeMap.values()),
    async ({ executor, rules: rulesToMigrate }) => {
      return executor ? executor({ rules: rulesToMigrate }, context) : rulesToMigrate;
    },
    {
      concurrency: MIGRATION_CONCURRENCY,
    }
  );

  return migrated.flat();
};

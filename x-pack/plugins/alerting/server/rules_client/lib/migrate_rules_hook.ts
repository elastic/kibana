/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { MigrateRules } from '../..';
import type { SanitizedRule } from '../../types';

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
    if (ruleTypeMap.has(ruleType.id)) {
      ruleTypeMap.get(ruleType.id)?.rules.push(rule);
    } else {
      ruleTypeMap.set(ruleType.id, { executor: ruleType?.migrateRules, rules: [rule] });
    }
  });

  const migrated = await pMap(
    Array.from(ruleTypeMap.values()),
    async ({ executor, rules: rulesToMigrate }) => {
      return executor ? executor({ rules: rulesToMigrate }, context) : rulesToMigrate;
    },
    {
      concurrency: 5,
    }
  );

  return migrated.flat();
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrateRules } from '../..';

export const migrateRulesHook: MigrateRules = async ({ rules }, context) => {
  const migratedRules = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleType = context.ruleTypeRegistry.get(rule.alertTypeId);

    const migratedRule = ruleType?.migrateRules
      ? (await ruleType?.migrateRules({ rules: [rule] }, context))?.[0]
      : rule;

    migratedRules.push(migratedRule);
  }

  return migratedRules;
};

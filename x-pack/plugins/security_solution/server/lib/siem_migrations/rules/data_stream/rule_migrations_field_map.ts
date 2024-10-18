/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap, SchemaFieldMapKeys } from '@kbn/data-stream-adapter';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';

export const ruleMigrationsFieldMap: FieldMap<SchemaFieldMapKeys<RuleMigration>> = {
  migrationId: { type: 'keyword', required: true },
  status: { type: 'keyword', required: true },
  originalRule: { type: 'nested', required: true },
  'originalRule.vendor': { type: 'keyword', required: true },
  'originalRule.id': { type: 'keyword', required: true },
  'originalRule.title': { type: 'keyword', required: true },
  'originalRule.description': { type: 'keyword', required: false },
  'originalRule.query': { type: 'keyword', required: true },
  'originalRule.queryLanguage': { type: 'keyword', required: true },
  'originalRule.mitreAttackIds': { type: 'keyword', array: true, required: true },
  elasticRule: { type: 'nested', required: false },
  'elasticRule.title': { type: 'keyword', required: true },
  'elasticRule.query': { type: 'keyword', required: true },
  'elasticRule.queryLanguage': { type: 'keyword', required: true },
  'elasticRule.description': { type: 'keyword', required: false },
  'elasticRule.severity': { type: 'keyword', required: false },
  'elasticRule.prebuiltRuleId': { type: 'keyword', required: false },
  'elasticRule.id': { type: 'keyword', required: false },
  translationState: { type: 'keyword', required: false },
  comments: { type: 'text', array: true, required: false },
  createdAt: { type: 'date', required: false },
  updatedAt: { type: 'date', required: false },
  updatedBy: { type: 'keyword', required: false },
};

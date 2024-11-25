/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap, SchemaFieldMapKeys } from '@kbn/data-stream-adapter';
import type {
  RuleMigration,
  RuleMigrationResource,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';

export const ruleMigrationsFieldMap: FieldMap<SchemaFieldMapKeys<Omit<RuleMigration, 'id'>>> = {
  '@timestamp': { type: 'date', required: false },
  migration_id: { type: 'keyword', required: true },
  created_by: { type: 'keyword', required: true },
  status: { type: 'keyword', required: true },
  original_rule: { type: 'nested', required: true },
  'original_rule.vendor': { type: 'keyword', required: true },
  'original_rule.id': { type: 'keyword', required: true },
  'original_rule.title': { type: 'keyword', required: true },
  'original_rule.description': { type: 'keyword', required: false },
  'original_rule.query': { type: 'text', required: true },
  'original_rule.query_language': { type: 'keyword', required: true },
  'original_rule.mitre_attack_ids': { type: 'keyword', array: true, required: false },
  elastic_rule: { type: 'nested', required: false },
  'elastic_rule.title': { type: 'keyword', required: true },
  'elastic_rule.query': { type: 'text', required: true },
  'elastic_rule.query_language': { type: 'keyword', required: true },
  'elastic_rule.description': { type: 'keyword', required: false },
  'elastic_rule.severity': { type: 'keyword', required: false },
  'elastic_rule.prebuilt_rule_id': { type: 'keyword', required: false },
  'elastic_rule.id': { type: 'keyword', required: false },
  translation_result: { type: 'keyword', required: false },
  comments: { type: 'text', array: true, required: false },
  updated_at: { type: 'date', required: false },
  updated_by: { type: 'keyword', required: false },
};

export const ruleMigrationResourcesFieldMap: FieldMap<
  SchemaFieldMapKeys<Omit<RuleMigrationResource, 'id'>>
> = {
  migration_id: { type: 'keyword', required: true },
  type: { type: 'keyword', required: true },
  name: { type: 'keyword', required: true },
  content: { type: 'text', required: false },
  metadata: { type: 'object', required: false },
  updated_at: { type: 'date', required: false },
  updated_by: { type: 'keyword', required: false },
};

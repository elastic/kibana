/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '../../api/detection_engine';
import { DEFAULT_TRANSLATION_FIELDS, DEFAULT_TRANSLATION_SEVERITY } from '../constants';
import type { ElasticRule, ElasticRulePartial } from '../model/rule_migration.gen';

export type MigrationPrebuiltRule = ElasticRulePartial &
  Required<Pick<ElasticRulePartial, 'title' | 'description' | 'prebuilt_rule_id'>>;

export type MigrationCustomRule = ElasticRulePartial &
  Required<Pick<ElasticRulePartial, 'title' | 'description' | 'query' | 'query_language'>>;

export const isMigrationPrebuiltRule = (rule?: ElasticRule): rule is MigrationPrebuiltRule =>
  !!(rule?.title && rule?.description && rule?.prebuilt_rule_id);

export const isMigrationCustomRule = (rule?: ElasticRule): rule is MigrationCustomRule =>
  !isMigrationPrebuiltRule(rule) &&
  !!(rule?.title && rule?.description && rule?.query && rule?.query_language);

export const convertMigrationCustomRuleToSecurityRulePayload = (
  rule: MigrationCustomRule,
  enabled: boolean
) => {
  return {
    type: rule.query_language,
    language: rule.query_language,
    query: rule.query,
    name: rule.title,
    description: rule.description,
    enabled,

    ...DEFAULT_TRANSLATION_FIELDS,
    severity: (rule.severity as Severity) ?? DEFAULT_TRANSLATION_SEVERITY,
  };
};

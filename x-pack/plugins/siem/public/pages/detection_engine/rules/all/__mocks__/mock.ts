/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Rule, RuleError } from '../../../../../containers/detection_engine/rules';

export const mockRule = (id: string): Rule => ({
  created_at: '2020-01-10T21:11:45.839Z',
  updated_at: '2020-01-10T21:11:45.839Z',
  created_by: 'elastic',
  description: '24/7',
  enabled: true,
  false_positives: [],
  filters: [],
  from: 'now-300s',
  id,
  immutable: false,
  index: ['auditbeat-*'],
  interval: '5m',
  rule_id: 'b5ba41ab-aaf3-4f43-971b-bdf9434ce0ea',
  language: 'kuery',
  output_index: '.siem-signals-default',
  max_signals: 100,
  risk_score: 21,
  name: 'Home Grown!',
  query: '',
  references: [],
  saved_id: "Garrett's IP",
  timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
  timeline_title: 'Untitled timeline',
  meta: { from: '0m' },
  severity: 'low',
  updated_by: 'elastic',
  tags: [],
  to: 'now',
  type: 'saved_query',
  threat: [],
  version: 1,
});

export const mockRuleError = (id: string): RuleError => ({
  rule_id: id,
  error: { status_code: 404, message: `id: "${id}" not found` },
});

export const mockRules: Rule[] = [
  mockRule('abe6c564-050d-45a5-aaf0-386c37dd1f61'),
  mockRule('63f06f34-c181-4b2d-af35-f2ace572a1ee'),
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFilters } from '../../../../../../../../../../src/plugins/data/public';
import { Rule, RuleError } from '../../../../../containers/detection_engine/rules';
import { AboutStepRule, ActionsStepRule, DefineStepRule, ScheduleStepRule } from '../../types';
import { FieldValueQueryBar } from '../../../../../components/rules/query_bar';

export const mockQueryBar: FieldValueQueryBar = {
  query: {
    query: 'test query',
    language: 'kuery',
  },
  filters: [
    {
      $state: {
        store: esFilters.FilterStateStore.GLOBAL_STATE,
      },
      meta: {
        alias: null,
        disabled: false,
        key: 'event.category',
        negate: false,
        params: {
          query: 'file',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'event.category': 'file',
        },
      },
    },
  ],
  saved_id: 'test123',
};

export const mockRule = (id: string): Rule => ({
  actions: [],
  author: [],
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
  risk_score_mapping: [],
  name: 'Home Grown!',
  query: '',
  references: [],
  saved_id: "Garrett's IP",
  timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
  timeline_title: 'Untitled timeline',
  meta: { from: '0m' },
  severity: 'low',
  severity_mapping: [],
  updated_by: 'elastic',
  tags: [],
  to: 'now',
  type: 'saved_query',
  threat: [],
  throttle: 'no_actions',
  note: '# this is some markdown documentation',
  version: 1,
});

export const mockRuleWithEverything = (id: string): Rule => ({
  actions: [],
  author: [],
  created_at: '2020-01-10T21:11:45.839Z',
  updated_at: '2020-01-10T21:11:45.839Z',
  created_by: 'elastic',
  description: '24/7',
  enabled: true,
  false_positives: ['test'],
  filters: [
    {
      $state: {
        store: esFilters.FilterStateStore.GLOBAL_STATE,
      },
      meta: {
        alias: null,
        disabled: false,
        key: 'event.category',
        negate: false,
        params: {
          query: 'file',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'event.category': 'file',
        },
      },
    },
  ],
  from: 'now-300s',
  id,
  immutable: false,
  index: ['auditbeat-*'],
  interval: '5m',
  rule_id: 'b5ba41ab-aaf3-4f43-971b-bdf9434ce0ea',
  language: 'kuery',
  license: 'Elastic License',
  output_index: '.siem-signals-default',
  max_signals: 100,
  risk_score: 21,
  risk_score_mapping: [],
  rule_name_override: 'message',
  name: 'Query with rule-id',
  query: 'user.name: root or user.name: admin',
  references: ['www.test.co'],
  saved_id: 'test123',
  timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
  timeline_title: 'Titled timeline',
  meta: { from: '0m' },
  severity: 'low',
  severity_mapping: [],
  updated_by: 'elastic',
  tags: ['tag1', 'tag2'],
  to: 'now',
  type: 'saved_query',
  threat: [
    {
      framework: 'mockFramework',
      tactic: {
        id: '1234',
        name: 'tactic1',
        reference: 'reference1',
      },
      technique: [
        {
          id: '456',
          name: 'technique1',
          reference: 'technique reference',
        },
      ],
    },
  ],
  threshold: {
    field: 'host.name',
    value: 50,
  },
  throttle: 'no_actions',
  timestamp_override: 'event.ingested',
  note: '# this is some markdown documentation',
  version: 1,
});

// TODO: update types mapping
export const mockAboutStepRule = (isNew = false): AboutStepRule => ({
  isNew,
  author: ['Elastic'],
  isAssociatedToEndpointList: false,
  isBuildingBlock: false,
  timestampOverride: '',
  ruleNameOverride: '',
  license: 'Elastic License',
  name: 'Query with rule-id',
  description: '24/7',
  severity: { value: 'low', mapping: [] },
  riskScore: { value: 21, mapping: [] },
  references: ['www.test.co'],
  falsePositives: ['test'],
  tags: ['tag1', 'tag2'],
  threat: [
    {
      framework: 'mockFramework',
      tactic: {
        id: '1234',
        name: 'tactic1',
        reference: 'reference1',
      },
      technique: [
        {
          id: '456',
          name: 'technique1',
          reference: 'technique reference',
        },
      ],
    },
  ],
  note: '# this is some markdown documentation',
});

export const mockActionsStepRule = (isNew = false, enabled = false): ActionsStepRule => ({
  isNew,
  actions: [],
  kibanaSiemAppUrl: 'http://localhost:5601/app/siem',
  enabled,
  throttle: 'no_actions',
});

export const mockDefineStepRule = (isNew = false): DefineStepRule => ({
  isNew,
  ruleType: 'query',
  anomalyThreshold: 50,
  machineLearningJobId: '',
  index: ['filebeat-'],
  queryBar: mockQueryBar,
  timeline: {
    id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
    title: 'Titled timeline',
  },
  threshold: {
    field: [''],
    value: '100',
  },
});

export const mockScheduleStepRule = (isNew = false): ScheduleStepRule => ({
  isNew,
  interval: '5m',
  from: '6m',
  to: 'now',
});

export const mockRuleError = (id: string): RuleError => ({
  rule_id: id,
  error: { status_code: 404, message: `id: "${id}" not found` },
});

export const mockRules: Rule[] = [
  mockRule('abe6c564-050d-45a5-aaf0-386c37dd1f61'),
  mockRule('63f06f34-c181-4b2d-af35-f2ace572a1ee'),
];

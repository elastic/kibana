/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore } from '@kbn/es-query';
import type {
  AboutStepRule,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from '../../../../../detections/pages/detection_engine/rules/types';
import {
  DataSourceType,
  GroupByOptions,
} from '../../../../../detections/pages/detection_engine/rules/types';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar';
import { fillEmptySeverityMappings } from '../../../../../detections/pages/detection_engine/rules/helpers';
import { getThreatMock } from '../../../../../../common/detection_engine/schemas/types/threat.mock';
import type { RuleResponse, SavedQueryRule } from '../../../../../../common/api/detection_engine';

export const mockQueryBar: FieldValueQueryBar = {
  query: {
    query: 'test query',
    language: 'kuery',
  },
  filters: [
    {
      $state: {
        store: FilterStateStore.GLOBAL_STATE,
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

export const mockRule = (id: string): SavedQueryRule => ({
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
  related_integrations: [],
  required_fields: [],
  setup: '# this is some setup documentation',
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
  revision: 1,
  exceptions_list: [],
});

export const mockRuleWithEverything = (id: string): RuleResponse => ({
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
        store: FilterStateStore.GLOBAL_STATE,
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
  related_integrations: [],
  required_fields: [],
  setup: '# this is some setup documentation',
  severity: 'low',
  severity_mapping: [],
  updated_by: 'elastic',
  tags: ['tag1', 'tag2'],
  to: 'now',
  type: 'saved_query',
  threat: getThreatMock(),
  // @ts-expect-error This rule stub contains all the fields making it invalid for the RuleResponse type
  threshold: {
    field: ['host.name'],
    value: 50,
    cardinality: [
      {
        field: 'process.name',
        value: 2,
      },
    ],
  },
  throttle: 'no_actions',
  timestamp_override: 'event.ingested',
  timestamp_override_fallback_disabled: false,
  note: '# this is some markdown documentation',
  version: 1,
  alert_suppression: {
    group_by: ['host.name'],
  },
  new_terms_fields: ['host.name'],
  history_window_start: 'now-7d',
});

// TODO: update types mapping
export const mockAboutStepRule = (): AboutStepRule => ({
  author: ['Elastic'],
  isAssociatedToEndpointList: false,
  isBuildingBlock: false,
  timestampOverride: '',
  ruleNameOverride: '',
  license: 'Elastic License',
  name: 'Query with rule-id',
  description: '24/7',
  riskScore: { value: 21, mapping: [], isMappingChecked: false },
  severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
  references: ['www.test.co'],
  falsePositives: ['test'],
  tags: ['tag1', 'tag2'],
  threat: getThreatMock(),
  note: '# this is some markdown documentation',
  setup: '# this is some setup documentation',
  investigationFields: ['foo', 'bar'],
});

export const mockActionsStepRule = (enabled = false): ActionsStepRule => ({
  actions: [],
  kibanaSiemAppUrl: 'http://localhost:5601/app/siem',
  enabled,
});

export const mockDefineStepRule = (): DefineStepRule => ({
  ruleType: 'query',
  anomalyThreshold: 50,
  machineLearningJobId: [],
  index: ['filebeat-'],
  dataViewId: undefined,
  queryBar: mockQueryBar,
  threatQueryBar: mockQueryBar,
  requiredFields: [],
  relatedIntegrations: [],
  threatMapping: [],
  timeline: {
    id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
    title: 'Titled timeline',
  },
  threatIndex: [],
  threshold: {
    field: [],
    value: '100',
    cardinality: {
      field: ['process.name'],
      value: '2',
    },
  },
  eqlOptions: {},
  dataSourceType: DataSourceType.IndexPatterns,
  newTermsFields: ['host.ip'],
  historyWindowSize: '7d',
  shouldLoadQueryDynamically: false,
  groupByFields: [],
  groupByRadioSelection: GroupByOptions.PerRuleExecution,
  groupByDuration: {
    unit: 'm',
    value: 5,
  },
  enableThresholdSuppression: false,
});

export const mockScheduleStepRule = (): ScheduleStepRule => ({
  interval: '5m',
  from: '6m',
  to: 'now',
});

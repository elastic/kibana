/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceType, KqlQueryType } from '../../../../../../../../common/api/detection_engine';
import type {
  DiffableAllFields,
  DiffableCommonFields,
  DiffableCustomQueryFields,
  DiffableEqlFields,
  DiffableEsqlFields,
  DiffableMachineLearningFields,
  DiffableRule,
  DiffableSavedQueryFields,
  DiffableThreatMatchFields,
  SavedKqlQuery,
} from '../../../../../../../../common/api/detection_engine';
import { DEFAULT_MAX_SIGNALS } from '../../../../../../../../common/constants';

export const filters = [
  {
    meta: {
      disabled: false,
      negate: false,
      alias: null,
      index: 'logs-*',
      key: '@timestamp',
      field: '@timestamp',
      value: 'exists',
      type: 'exists',
    },
    query: {
      exists: {
        field: '@timestamp',
      },
    },
    $state: {
      store: 'appState',
    },
  },
];

export const savedQueryResponse = {
  id: 'fake-saved-query-id',
  attributes: {
    title: 'Fake Saved Query',
    description: '',
    query: {
      query: 'file.path: "/etc/passwd" and event.action: "modification"',
      language: 'kuery',
    },
    filters,
  },
  namespaces: ['default'],
};

export const inlineKqlQuery: DiffableAllFields['kql_query'] = {
  type: KqlQueryType.inline_query,
  query: 'event.action: "user_login" and source.ip: "192.168.1.100"',
  language: 'kuery',
  filters,
};

export const savedKqlQuery: SavedKqlQuery = {
  type: KqlQueryType.saved_query,
  saved_query_id: 'fake-saved-query-id',
};

export const eqlQuery: DiffableAllFields['eql_query'] = {
  query: 'process where process.name == "powershell.exe" and process.args : "* -EncodedCommand *"',
  language: 'eql',
  filters,
};

export const dataSourceWithIndexPatterns: DiffableAllFields['data_source'] = {
  type: DataSourceType.index_patterns,
  index_patterns: ['logs-*'],
};

export const dataSourceWithDataView: DiffableAllFields['data_source'] = {
  type: DataSourceType.data_view,
  data_view_id: 'logs-*',
};

type DataViewDeps = ConstructorParameters<typeof DataView>[0];

export function mockDataView(spec: Partial<DataViewDeps['spec']> = {}): DataView {
  const dataView = new DataView({
    spec: {
      title: 'logs-*',
      fields: {
        '@timestamp': {
          name: '@timestamp',
          type: 'date',
          searchable: true,
          aggregatable: true,
        },
      },
      ...spec,
    },
    fieldFormats: {
      getDefaultInstance: () => ({
        toJSON: () => ({}),
      }),
    } as unknown as FieldFormatsStartCommon,
  });

  return dataView;
}

const commonDiffableRuleFields: DiffableCommonFields = {
  rule_id: 'some-rule-id',
  version: 1,

  name: 'Some Rule Name',
  tags: [],
  description: 'Some rule description',
  severity: 'low',
  severity_mapping: [],
  risk_score: 1,
  risk_score_mapping: [],

  references: [],
  false_positives: [],
  threat: [],
  note: '',
  setup: '',
  related_integrations: [],
  required_fields: [],
  author: [],
  license: '',

  rule_schedule: {
    interval: '5m',
    lookback: '360s',
  },
  exceptions_list: [],
  max_signals: DEFAULT_MAX_SIGNALS,
};

const customQueryDiffableRuleFields: DiffableCustomQueryFields = {
  type: 'query',
  kql_query: {
    type: KqlQueryType.inline_query,
    query: '*',
    language: 'kuery',
    filters: [],
  },
};

export function mockCustomQueryRule(
  overrides: Partial<DiffableCommonFields & DiffableCustomQueryFields>
): DiffableRule {
  return {
    ...commonDiffableRuleFields,
    ...customQueryDiffableRuleFields,
    ...overrides,
  };
}

const savedQueryDiffableRuleFields: DiffableSavedQueryFields = {
  type: 'saved_query',
  kql_query: {
    type: KqlQueryType.saved_query,
    saved_query_id: 'some-saved-query-id',
  },
};

export function mockSavedQueryRule(
  overrides: Partial<DiffableCommonFields & DiffableSavedQueryFields>
): DiffableRule {
  return {
    ...commonDiffableRuleFields,
    ...savedQueryDiffableRuleFields,
    ...overrides,
  };
}

const eqlDiffableRuleFields: DiffableEqlFields = {
  type: 'eql',
  eql_query: {
    query: 'any where true',
    language: 'eql',
    filters: [],
  },
};

export function mockEqlRule(
  overrides: Partial<DiffableCommonFields & DiffableEqlFields>
): DiffableRule {
  return {
    ...commonDiffableRuleFields,
    ...eqlDiffableRuleFields,
    ...overrides,
  };
}

const esqlDiffableRuleFields: DiffableEsqlFields = {
  type: 'esql',
  esql_query: {
    query: 'SELECT * FROM any',
    language: 'esql',
  },
};

export function mockEsqlRule(
  overrides: Partial<DiffableCommonFields & DiffableEsqlFields>
): DiffableRule {
  return {
    ...commonDiffableRuleFields,
    ...esqlDiffableRuleFields,
    ...overrides,
  };
}

const machineLearningDiffableRuleFields: DiffableMachineLearningFields = {
  type: 'machine_learning',
  machine_learning_job_id: 'ml-job-id-123',
  anomaly_threshold: 0,
};

export function mockMachineLearningRule(
  overrides: Partial<DiffableCommonFields & DiffableMachineLearningFields>
): DiffableRule {
  return {
    ...commonDiffableRuleFields,
    ...machineLearningDiffableRuleFields,
    ...overrides,
  };
}

const threatMatchDiffableRuleFields: DiffableThreatMatchFields = {
  type: 'threat_match',
  kql_query: {
    type: KqlQueryType.inline_query,
    query: '*',
    language: 'kuery',
    filters: [],
  },
  threat_query: {
    type: KqlQueryType.inline_query,
    query: '*',
    language: 'kuery',
    filters: [],
  },
  threat_index: [],
  threat_mapping: [
    {
      entries: [
        {
          field: 'abc',
          type: 'mapping',
          value: 'xyz',
        },
      ],
    },
  ],
};

export function mockThreatMatchRule(
  overrides: Partial<DiffableCommonFields & DiffableThreatMatchFields>
): DiffableRule {
  return {
    ...commonDiffableRuleFields,
    ...threatMatchDiffableRuleFields,
    ...overrides,
  };
}

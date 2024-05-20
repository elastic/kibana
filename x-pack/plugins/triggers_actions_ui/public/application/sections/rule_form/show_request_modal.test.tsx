/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, cleanup } from '@testing-library/react';
import { ShowRequestModal, ShowRequestModalProps } from './show_request_modal';
import { Rule, RuleTypeParams, RuleUpdates } from '../../../types';
import { InitialRule } from './rule_reducer';

const testDate = new Date('2024-04-04T19:34:24.902Z');
const shared = {
  params: {
    searchType: 'esQuery',
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [1000],
    thresholdComparator: '>',
    size: 100,
    esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
    aggType: 'count',
    groupBy: 'all',
    termSize: 5,
    excludeHitsFromPreviousRun: false,
    sourceFields: [],
    index: ['.kibana'],
    timeField: 'created_at',
  },
  consumer: 'stackAlerts',
  ruleTypeId: '.es-query',
  schedule: { interval: '1m' },
  actions: [
    {
      id: '0be65bf4-58b8-4c44-ba4d-5112c65103f5',
      actionTypeId: '.server-log',
      group: 'query matched',
      params: {
        level: 'info',
        message:
          "Elasticsearch query rule '{{rule.name}}' is active:\n\n- Value: {{context.value}}\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\n- Timestamp: {{context.date}}\n- Link: {{context.link}}",
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: 'a330a154-61fb-42a8-9bce-9dfd8513a12d',
    },
  ],
  tags: ['test'],
  name: 'test',
};

const rule: Rule<RuleTypeParams> | InitialRule = { ...shared };

const editRule: Rule<RuleTypeParams> = {
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: testDate,
  updatedAt: testDate,
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  snoozeSchedule: [],
  executionStatus: {
    lastExecutionDate: testDate,
    lastDuration: 46,
    status: 'ok',
  },
  scheduledTaskId: '0de7273e-c5db-4d5c-8e28-1aab363e1abc',
  lastRun: {
    outcomeMsg: null,
    outcomeOrder: 0,
    alertsCount: { active: 0, new: 0, recovered: 0, ignored: 0 },
    outcome: 'succeeded',
    warning: null,
  },
  nextRun: testDate,
  apiKeyCreatedByUser: false,
  id: '0de7273e-c5db-4d5c-8e28-1aab363e1abc',
  enabled: true,
  revision: 0,
  running: false,
  monitoring: {
    run: {
      history: [{ success: true, timestamp: 1712259266100, duration: 65 }],
      calculated_metrics: { success_ratio: 1, p50: 45, p95: 64.65, p99: 968 },
      last_run: {
        timestamp: '2024-04-04T20:39:01.655Z',
        metrics: {
          duration: 46,
          total_search_duration_ms: null,
          total_indexing_duration_ms: null,
          total_alerts_detected: null,
          total_alerts_created: null,
          gap_duration_s: null,
        },
      },
    },
  },
  ...shared,
};

const ShowRequestModalWithProviders: React.FunctionComponent<ShowRequestModalProps> = (props) => (
  <IntlProvider locale="en">
    <ShowRequestModal {...props} />
  </IntlProvider>
);

describe('rules_settings_modal', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test('renders create request correctly', async () => {
    const modalProps: ShowRequestModalProps = {
      rule: {
        ...rule,
      } as RuleUpdates,
      onClose: jest.fn(),
    };
    const result = render(<ShowRequestModalWithProviders {...modalProps} />);
    expect(result.getByTestId('modalHeaderTitle').textContent).toBe('Create alerting rule request');
    expect(result.getByTestId('modalSubtitle').textContent).toBe(
      'This Kibana request will create this rule.'
    );
    expect(result.getByTestId('modalRequestCodeBlock').textContent).toMatchInlineSnapshot(`
      "POST kbn:/api/alerting/rule
      {
        \\"params\\": {
          \\"searchType\\": \\"esQuery\\",
          \\"timeWindowSize\\": 5,
          \\"timeWindowUnit\\": \\"m\\",
          \\"threshold\\": [
            1000
          ],
          \\"thresholdComparator\\": \\">\\",
          \\"size\\": 100,
          \\"esQuery\\": \\"{\\\\n    \\\\\\"query\\\\\\":{\\\\n      \\\\\\"match_all\\\\\\" : {}\\\\n    }\\\\n  }\\",
          \\"aggType\\": \\"count\\",
          \\"groupBy\\": \\"all\\",
          \\"termSize\\": 5,
          \\"excludeHitsFromPreviousRun\\": false,
          \\"sourceFields\\": [],
          \\"index\\": [
            \\".kibana\\"
          ],
          \\"timeField\\": \\"created_at\\"
        },
        \\"consumer\\": \\"stackAlerts\\",
        \\"schedule\\": {
          \\"interval\\": \\"1m\\"
        },
        \\"tags\\": [
          \\"test\\"
        ],
        \\"name\\": \\"test\\",
        \\"rule_type_id\\": \\".es-query\\",
        \\"actions\\": [
          {
            \\"group\\": \\"query matched\\",
            \\"id\\": \\"0be65bf4-58b8-4c44-ba4d-5112c65103f5\\",
            \\"params\\": {
              \\"level\\": \\"info\\",
              \\"message\\": \\"Elasticsearch query rule '{{rule.name}}' is active:\\\\n\\\\n- Value: {{context.value}}\\\\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\\\\n- Timestamp: {{context.date}}\\\\n- Link: {{context.link}}\\"
            },
            \\"frequency\\": {
              \\"notify_when\\": \\"onActionGroupChange\\",
              \\"throttle\\": null,
              \\"summary\\": false
            }
          }
        ]
      }"
    `);
  });

  test('renders edit request correctly', async () => {
    const modalProps: ShowRequestModalProps = {
      edit: true,
      ruleId: editRule.id,
      rule: {
        ...editRule,
      } as RuleUpdates,
      onClose: jest.fn(),
    };
    const result = render(<ShowRequestModalWithProviders {...modalProps} />);
    expect(result.getByTestId('modalHeaderTitle').textContent).toBe('Edit alerting rule request');
    expect(result.getByTestId('modalSubtitle').textContent).toBe(
      'This Kibana request will edit this rule.'
    );
    expect(result.getByTestId('modalRequestCodeBlock').textContent).toMatchInlineSnapshot(`
      "PUT kbn:/api/alerting/rule/0de7273e-c5db-4d5c-8e28-1aab363e1abc
      {
        \\"name\\": \\"test\\",
        \\"tags\\": [
          \\"test\\"
        ],
        \\"schedule\\": {
          \\"interval\\": \\"1m\\"
        },
        \\"params\\": {
          \\"searchType\\": \\"esQuery\\",
          \\"timeWindowSize\\": 5,
          \\"timeWindowUnit\\": \\"m\\",
          \\"threshold\\": [
            1000
          ],
          \\"thresholdComparator\\": \\">\\",
          \\"size\\": 100,
          \\"esQuery\\": \\"{\\\\n    \\\\\\"query\\\\\\":{\\\\n      \\\\\\"match_all\\\\\\" : {}\\\\n    }\\\\n  }\\",
          \\"aggType\\": \\"count\\",
          \\"groupBy\\": \\"all\\",
          \\"termSize\\": 5,
          \\"excludeHitsFromPreviousRun\\": false,
          \\"sourceFields\\": [],
          \\"index\\": [
            \\".kibana\\"
          ],
          \\"timeField\\": \\"created_at\\"
        },
        \\"actions\\": [
          {
            \\"group\\": \\"query matched\\",
            \\"id\\": \\"0be65bf4-58b8-4c44-ba4d-5112c65103f5\\",
            \\"params\\": {
              \\"level\\": \\"info\\",
              \\"message\\": \\"Elasticsearch query rule '{{rule.name}}' is active:\\\\n\\\\n- Value: {{context.value}}\\\\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\\\\n- Timestamp: {{context.date}}\\\\n- Link: {{context.link}}\\"
            },
            \\"frequency\\": {
              \\"notify_when\\": \\"onActionGroupChange\\",
              \\"throttle\\": null,
              \\"summary\\": false
            },
            \\"uuid\\": \\"a330a154-61fb-42a8-9bce-9dfd8513a12d\\"
          }
        ]
      }"
    `);
  });
});

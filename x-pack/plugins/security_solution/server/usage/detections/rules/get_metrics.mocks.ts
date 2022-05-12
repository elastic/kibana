/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { CommentAttributes, CommentType } from '@kbn/cases-plugin/common/api/cases/comment';
import type { AlertAggs, EventLogTypeStatusAggs } from '../../types';
import type { EventLogStatusMetric, SingleEventLogStatusMetric } from './types';

export const getMockRuleAlertsResponse = (docCount: number): SearchResponse<never, AlertAggs> => ({
  took: 7,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 7322,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    buckets: {
      after_key: {
        detectionAlerts: '6eecd8c2-8bfb-11eb-afbe-1b7a66309c6d',
      },
      buckets: [
        {
          key: {
            detectionAlerts: '6eecd8c2-8bfb-11eb-afbe-1b7a66309c6d',
          },
          doc_count: docCount,
        },
      ],
    },
  },
});

export const getMockAlertCaseCommentsResponse = (): SavedObjectsFindResponse<
  Partial<CommentAttributes>,
  never
> => ({
  page: 1,
  per_page: 10000,
  total: 4,
  saved_objects: [
    {
      type: 'cases-comments',
      id: '3bb5cc10-9249-11eb-85b7-254c8af1a983',
      attributes: {
        type: CommentType.alert,
        alertId: '54802763917f521249c9f68d0d4be0c26cc538404c26dfed1ae7dcfa94ea2226',
        index: '.siem-signals-default-000001',
        rule: {
          id: '6eecd8c2-8bfb-11eb-afbe-1b7a66309c6d',
          name: 'Azure Diagnostic Settings Deletion',
        },
        created_at: '2021-03-31T17:47:59.449Z',
        created_by: {
          email: '',
          full_name: '',
          username: '',
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      },
      references: [
        {
          type: 'cases',
          name: 'associated-cases',
          id: '3a3a4fa0-9249-11eb-85b7-254c8af1a983',
        },
      ],
      migrationVersion: {},
      coreMigrationVersion: '8.0.0',
      updated_at: '2021-03-31T17:47:59.818Z',
      version: 'WzI3MDIyODMsNF0=',
      namespaces: ['default'],
      score: 0,
    },
  ],
});

export const getEmptySavedObjectResponse = (): SavedObjectsFindResponse<never, never> => ({
  page: 1,
  per_page: 1_000,
  total: 0,
  saved_objects: [],
});

/**
 * Returns the event log all rules for testing when you get all the rules.
 * See "getEventLogAllRulesResult" for the transform results for use in tests
 * @see get_event_log_by_type_and_status
 * @see getEventLogAllRulesResult
 * @returns The Elasticsearch aggregation for all the rules
 */
export const getEventLogAllRules = (): SearchResponse<never, EventLogTypeStatusAggs> => ({
  took: 495,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    eventActionExecutionMetrics: {
      doc_count: 325,
      'siem.queryRule': {
        doc_count: 325,
        maxTotalIndexDuration: {
          value: 228568,
        },
        avgGapDuration: {
          value: 4246.375,
        },
        maxTotalSearchDuration: {
          value: 324,
        },
        gapCount: {
          value: 6,
        },
        avgTotalIndexDuration: {
          value: 2610.1356466876973,
        },
        minTotalIndexDuration: {
          value: 0,
        },
        minGapDuration: {
          value: 2811,
        },
        avgTotalSearchDuration: {
          value: 23.42902208201893,
        },
        minTotalSearchDuration: {
          value: 1,
        },
        maxGapDuration: {
          value: 5651,
        },
      },
      'siem.savedQueryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.eqlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.thresholdRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.mlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.indicatorRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
    },
    eventActionStatusChange: {
      doc_count: 1297,
      'partial failure': {
        doc_count: 325,
        'siem.queryRule': {
          doc_count: 325,
          categories: {
            buckets: [
              {
                doc_count: 163,
                key: 'This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching blah frank was found This warning will continue to appear until matching index is created or this rule is disabled',
              },
              {
                doc_count: 162,
                key: 'This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching logs-endpoint.alerts was found This warning will continue to appear until matching index is created or this rule is disabled If you have recently enrolled agents enabled with Endpoint Security through Fleet this warning should stop once an alert is sent from an agent',
              },
            ],
          },
          cardinality: {
            value: 2,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      failed: {
        doc_count: 8,
        'siem.queryRule': {
          doc_count: 8,
          categories: {
            buckets: [
              {
                doc_count: 2,
                key: 'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name * id rule id execution id space ID default',
              },
              {
                doc_count: 2,
                key: 'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name * id rule id execution id space ID default',
              },
              {
                doc_count: 1,
                key: 'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Endpoint Security id rule id execution id space ID default',
              },
              {
                doc_count: 1,
                key: 'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Telnet Port Activity id rule id execution id space ID default',
              },
              {
                doc_count: 1,
                key: 'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Endpoint Security id rule id execution id space ID default',
              },
              {
                doc_count: 1,
                key: 'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Telnet Port Activity id rule id execution id space ID default',
              },
            ],
          },
          cardinality: {
            value: 4,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      succeeded: {
        doc_count: 317,
        'siem.queryRule': {
          doc_count: 317,
          cardinality: {
            value: 2,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
      },
    },
  },
});

/**
 * Returns empty event log all rules for testing when you get all the rules.
 * See "getEventLogAllRulesResult" for the transform results for use in tests
 * @see get_event_log_by_type_and_status
 * @see getEventLogAllRulesResult
 * @returns The Elasticsearch aggregation for all the rules
 */
export const getEmptyEventLogAllRules = (): SearchResponse<never, EventLogTypeStatusAggs> => ({
  took: 495,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    eventActionExecutionMetrics: {
      doc_count: 0,
      'siem.queryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.savedQueryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.eqlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.thresholdRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.mlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.indicatorRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
    },
    eventActionStatusChange: {
      doc_count: 0,
      'partial failure': {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      failed: {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      succeeded: {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
      },
    },
  },
});

/**
 * Returns the event log total rules for testing when you get elastic rules specifically.
 * See "getEventLogElasticRulesResult" for the transform results for use in tests
 * @see get_event_log_by_type_and_status
 * @see getEventLogElasticRulesResult
 * @returns The Elasticsearch aggregation for "elastic rules"/"immutable"/"pre-built rules"
 */
export const getEventLogElasticRules = (): SearchResponse<never, EventLogTypeStatusAggs> => ({
  took: 488,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    eventActionExecutionMetrics: {
      doc_count: 160,
      'siem.queryRule': {
        doc_count: 160,
        maxTotalIndexDuration: {
          value: 0,
        },
        avgGapDuration: {
          value: 4141.75,
        },
        maxTotalSearchDuration: {
          value: 278,
        },
        gapCount: {
          value: 4,
        },
        avgTotalIndexDuration: {
          value: 0,
        },
        minTotalIndexDuration: {
          value: 0,
        },
        minGapDuration: {
          value: 2811,
        },
        avgTotalSearchDuration: {
          value: 9.185897435897436,
        },
        minTotalSearchDuration: {
          value: 1,
        },
        maxGapDuration: {
          value: 5474,
        },
      },
      'siem.savedQueryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.eqlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.thresholdRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.mlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.indicatorRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
    },
    eventActionStatusChange: {
      doc_count: 642,
      'partial failure': {
        doc_count: 162,
        'siem.queryRule': {
          doc_count: 162,
          categories: {
            buckets: [
              {
                doc_count: 162,
                key: 'This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching logs-endpoint.alerts was found This warning will continue to appear until matching index is created or this rule is disabled If you have recently enrolled agents enabled with Endpoint Security through Fleet this warning should stop once an alert is sent from an agent',
              },
            ],
          },
          cardinality: {
            value: 1,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      failed: {
        doc_count: 4,
        'siem.queryRule': {
          doc_count: 4,
          categories: {
            buckets: [
              {
                doc_count: 1,
                key: 'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Endpoint Security id rule id execution id space ID default',
              },
              {
                doc_count: 1,
                key: 'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Telnet Port Activity id rule id execution id space ID default',
              },
              {
                doc_count: 1,
                key: 'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Endpoint Security id rule id execution id space ID default',
              },
              {
                doc_count: 1,
                key: 'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Telnet Port Activity id rule id execution id space ID default',
              },
            ],
          },
          cardinality: {
            value: 2,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      succeeded: {
        doc_count: 156,
        'siem.queryRule': {
          doc_count: 156,
          cardinality: {
            value: 1,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
      },
    },
  },
});

/**
 * Returns empty event log total rules for testing when you get elastic rules specifically.
 * See "getEventLogElasticRulesResult" for the transform results for use in tests
 * @see get_event_log_by_type_and_status
 * @see getEventLogElasticRulesResult
 * @returns The Elasticsearch aggregation for "elastic rules"/"immutable"/"pre-built rules"
 */
export const getEmptyEventLogElasticRules = (): SearchResponse<never, EventLogTypeStatusAggs> => ({
  took: 488,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    eventActionExecutionMetrics: {
      doc_count: 0,
      'siem.queryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.savedQueryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.eqlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.thresholdRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.mlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.indicatorRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
    },
    eventActionStatusChange: {
      doc_count: 0,
      'partial failure': {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      failed: {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      succeeded: {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
      },
    },
  },
});

/**
 * Returns the event log custom rules for testing when you get custom rules specifically.
 * See "getEventLogCustomRulesResult" for the transform results for use in tests
 * @see get_event_log_by_type_and_status
 * @see getEventLogCustomRulesResult
 * @returns The Elasticsearch aggregation for "custom rules"
 */
export const getElasticLogCustomRules = (): SearchResponse<never, EventLogTypeStatusAggs> => ({
  took: 487,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    eventActionExecutionMetrics: {
      doc_count: 165,
      'siem.queryRule': {
        doc_count: 165,
        maxTotalIndexDuration: {
          value: 228568,
        },
        avgGapDuration: {
          value: 4351,
        },
        maxTotalSearchDuration: {
          value: 324,
        },
        gapCount: {
          value: 2,
        },
        avgTotalIndexDuration: {
          value: 5139.211180124224,
        },
        minTotalIndexDuration: {
          value: 0,
        },
        minGapDuration: {
          value: 3051,
        },
        avgTotalSearchDuration: {
          value: 37.22981366459627,
        },
        minTotalSearchDuration: {
          value: 8,
        },
        maxGapDuration: {
          value: 5651,
        },
      },
      'siem.savedQueryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.eqlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.thresholdRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.mlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.indicatorRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
    },
    eventActionStatusChange: {
      doc_count: 655,
      'partial failure': {
        doc_count: 163,
        'siem.queryRule': {
          doc_count: 163,
          categories: {
            buckets: [
              {
                doc_count: 163,
                key: 'This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching blah frank was found This warning will continue to appear until matching index is created or this rule is disabled',
              },
            ],
          },
          cardinality: {
            value: 1,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      failed: {
        doc_count: 4,
        'siem.queryRule': {
          doc_count: 4,
          categories: {
            buckets: [
              {
                doc_count: 2,
                key: 'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name * id rule id execution id space ID default',
              },
              {
                doc_count: 2,
                key: 'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name * id rule id execution id space ID default',
              },
            ],
          },
          cardinality: {
            value: 2,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      succeeded: {
        doc_count: 161,
        'siem.queryRule': {
          doc_count: 161,
          cardinality: {
            value: 1,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
      },
    },
  },
});

/**
 * Returns the empty event log total rules for testing when you get custom rules specifically.
 * See "getEventLogCustomRulesResult" for the transform results for use in tests
 * @see get_event_log_by_type_and_status
 * @see getEventLogCustomRulesResult
 * @returns The Elasticsearch aggregation for "custom rules"
 */
export const getEmptyElasticLogCustomRules = (): SearchResponse<never, EventLogTypeStatusAggs> => ({
  took: 487,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    eventActionExecutionMetrics: {
      doc_count: 0,
      'siem.queryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.savedQueryRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.eqlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.thresholdRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.mlRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
      'siem.indicatorRule': {
        doc_count: 0,
        maxTotalIndexDuration: {
          value: null,
        },
        avgGapDuration: {
          value: null,
        },
        maxTotalSearchDuration: {
          value: null,
        },
        gapCount: {
          value: 0,
        },
        avgTotalIndexDuration: {
          value: null,
        },
        minTotalIndexDuration: {
          value: null,
        },
        minGapDuration: {
          value: null,
        },
        avgTotalSearchDuration: {
          value: null,
        },
        minTotalSearchDuration: {
          value: null,
        },
        maxGapDuration: {
          value: null,
        },
      },
    },
    eventActionStatusChange: {
      doc_count: 0,
      'partial failure': {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      failed: {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          categories: {
            buckets: [],
          },
          cardinality: {
            value: 0,
          },
        },
      },
      succeeded: {
        doc_count: 0,
        'siem.queryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.savedQueryRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.eqlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.thresholdRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.mlRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
        'siem.indicatorRule': {
          doc_count: 0,
          cardinality: {
            value: 0,
          },
        },
      },
    },
  },
});

/**
 * Gets the all rule results for tests.
 * @see getEventLogAllRules
 * @returns The transform of "getEventLogAllRules"
 */
export const getEventLogAllRulesResult = (): SingleEventLogStatusMetric => ({
  eql: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  threat_match: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  machine_learning: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  query: {
    failures: 4,
    top_failures: [
      {
        message:
          'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name * id rule id execution id space ID default',
        count: 2,
      },
      {
        message:
          'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name * id rule id execution id space ID default',
        count: 2,
      },
      {
        message:
          'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Endpoint Security id rule id execution id space ID default',
        count: 1,
      },
      {
        message:
          'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Telnet Port Activity id rule id execution id space ID default',
        count: 1,
      },
      {
        message:
          'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Endpoint Security id rule id execution id space ID default',
        count: 1,
      },
      {
        message:
          'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Telnet Port Activity id rule id execution id space ID default',
        count: 1,
      },
    ],
    partial_failures: 2,
    top_partial_failures: [
      {
        message:
          'This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching blah frank was found This warning will continue to appear until matching index is created or this rule is disabled',
        count: 163,
      },
      {
        message:
          'This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching logs-endpoint.alerts was found This warning will continue to appear until matching index is created or this rule is disabled If you have recently enrolled agents enabled with Endpoint Security through Fleet this warning should stop once an alert is sent from an agent',
        count: 162,
      },
    ],
    succeeded: 2,
    index_duration: {
      max: 228568,
      avg: 2610.1356466876973,
      min: 0,
    },
    search_duration: {
      max: 324,
      avg: 23.42902208201893,
      min: 1,
    },
    gap_duration: {
      max: 5651,
      avg: 4246.375,
      min: 2811,
    },
    gap_count: 6,
  },
  saved_query: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  threshold: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  total: {
    failures: 4,
    partial_failures: 2,
    succeeded: 2,
  },
});

/**
 * Gets the elastic rule results for tests.
 * @see getEventLogElasticRules
 * @returns The transform of "getEventLogElasticRules"
 */
export const getEventLogElasticRulesResult = (): SingleEventLogStatusMetric => ({
  eql: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  threat_match: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  machine_learning: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  query: {
    failures: 2,
    top_failures: [
      {
        message:
          'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Endpoint Security id rule id execution id space ID default',
        count: 1,
      },
      {
        message:
          'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Telnet Port Activity id rule id execution id space ID default',
        count: 1,
      },
      {
        message:
          'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Endpoint Security id rule id execution id space ID default',
        count: 1,
      },
      {
        message:
          'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name Telnet Port Activity id rule id execution id space ID default',
        count: 1,
      },
    ],
    partial_failures: 1,
    top_partial_failures: [
      {
        message:
          'This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching logs-endpoint.alerts was found This warning will continue to appear until matching index is created or this rule is disabled If you have recently enrolled agents enabled with Endpoint Security through Fleet this warning should stop once an alert is sent from an agent',
        count: 162,
      },
    ],
    succeeded: 1,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 278,
      avg: 9.185897435897436,
      min: 1,
    },
    gap_duration: {
      max: 5474,
      avg: 4141.75,
      min: 2811,
    },
    gap_count: 4,
  },
  saved_query: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  threshold: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  total: {
    failures: 2,
    partial_failures: 1,
    succeeded: 1,
  },
});

/**
 * Gets the custom rule results for tests.
 * @see getEventLogCustomRulesResult
 * @returns The transform of "getEventLogCustomRulesResult"
 */
export const getEventLogCustomRulesResult = (): SingleEventLogStatusMetric => ({
  eql: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  threat_match: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  machine_learning: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  query: {
    failures: 2,
    top_failures: [
      {
        message:
          'an hour were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name * id rule id execution id space ID default',
        count: 2,
      },
      {
        message:
          'hours were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances name * id rule id execution id space ID default',
        count: 2,
      },
    ],
    partial_failures: 1,
    top_partial_failures: [
      {
        message:
          'This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching blah frank was found This warning will continue to appear until matching index is created or this rule is disabled',
        count: 163,
      },
    ],
    succeeded: 1,
    index_duration: {
      max: 228568,
      avg: 5139.211180124224,
      min: 0,
    },
    search_duration: {
      max: 324,
      avg: 37.22981366459627,
      min: 8,
    },
    gap_duration: {
      max: 5651,
      avg: 4351,
      min: 3051,
    },
    gap_count: 2,
  },
  saved_query: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  threshold: {
    failures: 0,
    top_failures: [],
    partial_failures: 0,
    top_partial_failures: [],
    succeeded: 0,
    index_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    search_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_duration: {
      max: 0,
      avg: 0,
      min: 0,
    },
    gap_count: 0,
  },
  total: {
    failures: 2,
    partial_failures: 1,
    succeeded: 1,
  },
});

/**
 * Gets all rule results for tests.
 * @returns The transform of all the rule results
 */
export const getAllEventLogTransform = (): EventLogStatusMetric => ({
  all_rules: getEventLogAllRulesResult(),
  elastic_rules: getEventLogElasticRulesResult(),
  custom_rules: getEventLogCustomRulesResult(),
});

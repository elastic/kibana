/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleEventMetric } from '../../detections/rules/types';
import { transformSingleRuleMetric } from './transform_single_rule_metric';

describe('transform_single_rule_metric', () => {
  test('it transforms a single metric correctly', () => {
    const result = transformSingleRuleMetric({
      failed: {
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
      partialFailed: {
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
      succeeded: {
        doc_count: 317,
        cardinality: {
          value: 5,
        },
      },
      singleMetric: {
        doc_count: 5,
        maxTotalIndexDuration: {
          value: 5,
        },
        avgTotalIndexDuration: {
          value: 3,
        },
        minTotalIndexDuration: {
          value: 2,
        },
        gapCount: {
          value: 4,
        },
        maxGapDuration: {
          value: 8,
        },
        avgGapDuration: {
          value: 2,
        },
        minGapDuration: {
          value: 9,
        },
        maxTotalSearchDuration: {
          value: 4,
        },
        avgTotalSearchDuration: {
          value: 2,
        },
        minTotalSearchDuration: {
          value: 12,
        },
      },
    });

    expect(result).toEqual<SingleEventMetric>({
      failed: 2,
      top_failed: [
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
      partial_failure: 2,
      top_partial_failure: [
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
      succeeded: 5,
      index_duration: {
        max: 5,
        avg: 3,
        min: 2,
      },
      search_duration: {
        max: 4,
        avg: 2,
        min: 12,
      },
      gap_duration: {
        max: 8,
        avg: 2,
        min: 9,
      },
      gap_count: 4,
    });
  });
});

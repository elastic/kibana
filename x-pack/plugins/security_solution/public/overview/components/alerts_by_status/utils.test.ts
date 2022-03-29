/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAlertsData } from './mock_data';
import { parseAlertsData, sortSeverityBuckets, sortStatusBuckets } from './utils';

describe('sortStatusBuckets', () => {
  test('should sort status buckets', () => {
    const results = sortStatusBuckets(mockAlertsData?.aggregations?.alertsByStatus?.buckets ?? []);
    expect(results).toEqual([
      {
        key: 'open',
        doc_count: 28149,
        statusBySeverity: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'low',
              doc_count: 22717,
            },
            {
              key: 'high',
              doc_count: 5027,
            },
            {
              key: 'medium',
              doc_count: 405,
            },
          ],
        },
      },
      {
        key: 'acknowledged',
        doc_count: 0,
      },
      {
        key: 'closed',
        doc_count: 4,
        statusBySeverity: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'high',
              doc_count: 4,
            },
            {
              key: 'low',
              doc_count: 0,
            },
          ],
        },
      },
    ]);
  });
});

describe('sortSeverityBuckets', () => {
  test('should sort severity buckets', () => {
    const results = sortSeverityBuckets(
      mockAlertsData?.aggregations?.alertsByStatus?.buckets[1].statusBySeverity?.buckets ?? []
    );
    expect(results).toEqual([
      {
        key: 'high',
        doc_count: 4,
      },
      {
        key: 'medium',
        doc_count: 0,
      },
      {
        key: 'low',
        doc_count: 0,
      },
    ]);
  });
});

describe('parseAlertsData', () => {
  test('should sort severity buckets', () => {
    const results = parseAlertsData(mockAlertsData);
    expect(results).toEqual([
      {
        key: 'open',
        doc_count: 28149,
        link: null,
        statusBySeverity: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'low',
              doc_count: 22717,
            },
            {
              key: 'high',
              doc_count: 5027,
            },
            {
              key: 'medium',
              doc_count: 405,
            },
          ],
        },
        buckets: [
          {
            label: 'High',
            status: 'Open',
            value: 5027,
            group: 'open',
          },
          {
            label: 'Medium',
            status: 'Open',
            value: 405,
            group: 'open',
          },
          {
            label: 'Low',
            status: 'Open',
            value: 22717,
            group: 'open',
          },
        ],
      },
      {
        key: 'acknowledged',
        link: null,
        doc_count: 0,
        buckets: [
          {
            label: 'High',
            status: 'Acknowledged',
            value: 0,
            group: 'acknowledged',
          },
          {
            label: 'Medium',
            status: 'Acknowledged',
            value: 0,
            group: 'acknowledged',
          },
          {
            label: 'Low',
            status: 'Acknowledged',
            value: 0,
            group: 'acknowledged',
          },
        ],
      },
      {
        key: 'closed',
        doc_count: 4,
        link: null,
        statusBySeverity: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'high',
              doc_count: 4,
            },
            {
              key: 'low',
              doc_count: 0,
            },
          ],
        },
        buckets: [
          {
            label: 'High',
            status: 'Closed',
            value: 4,
            group: 'closed',
          },
          {
            label: 'Medium',
            status: 'Closed',
            value: 0,
            group: 'closed',
          },
          {
            label: 'Low',
            status: 'Closed',
            value: 0,
            group: 'closed',
          },
        ],
      },
    ]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertsByStatusResponse,
  AlertsByStatusAgg,
  StatusBucket,
  ParsedStatusBucket,
} from './types';
import { parseAlertsData } from './utils';

export const mockAlertsData: AlertsByStatusResponse<[], AlertsByStatusAgg> = {
  took: 4,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 10000,
      relation: 'gte',
    },
    hits: [],
  },
  aggregations: {
    alertsByStatus: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
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
        // {
        //   key: 'acknowledged',
        //   doc_count: 2,
        //   statusBySeverity: {
        //     doc_count_error_upper_bound: 0,
        //     sum_other_doc_count: 0,
        //     buckets: [
        //       {
        //         key: 'high',
        //         doc_count: 2,
        //       },
        //     ],
        //   },
        // },
      ] as StatusBucket[],
    },
  },
};

export const parsedMockAlertsData: ParsedStatusBucket[] = [
  {
    key: 'open',
    label: 'Open',
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
        group: 'open',
        key: 'critical',
        label: 'Critical',
        status: 'Open',
        value: 0,
      },
      {
        label: 'High',
        status: 'Open',
        value: 5027,
        group: 'open',
        key: 'high',
      },
      {
        label: 'Medium',
        status: 'Open',
        value: 405,
        group: 'open',
        key: 'medium',
      },
      {
        label: 'Low',
        status: 'Open',
        value: 22717,
        group: 'open',
        key: 'low',
      },
    ],
  },
  {
    key: 'acknowledged',
    label: 'Acknowledged',
    link: null,
    doc_count: 0,
    buckets: [
      {
        group: 'acknowledged',
        key: 'critical',
        label: 'Critical',
        status: 'Acknowledged',
        value: 0,
      },
      {
        label: 'High',
        status: 'Acknowledged',
        value: 0,
        group: 'acknowledged',
        key: 'high',
      },
      {
        label: 'Medium',
        status: 'Acknowledged',
        value: 0,
        group: 'acknowledged',
        key: 'medium',
      },
      {
        label: 'Low',
        status: 'Acknowledged',
        value: 0,
        group: 'acknowledged',
        key: 'low',
      },
    ],
  },
  {
    key: 'closed',
    label: 'Closed',
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
        group: 'closed',
        key: 'critical',
        label: 'Critical',
        status: 'Closed',
        value: 0,
      },
      {
        label: 'High',
        status: 'Closed',
        key: 'high',
        value: 4,
        group: 'closed',
      },
      {
        label: 'Medium',
        status: 'Closed',
        key: 'medium',
        value: 0,
        group: 'closed',
      },
      {
        label: 'Low',
        status: 'Closed',
        key: 'low',
        value: 0,
        group: 'closed',
      },
    ],
  },
];

export const alertsData = () => {
  return parseAlertsData(mockAlertsData);
};

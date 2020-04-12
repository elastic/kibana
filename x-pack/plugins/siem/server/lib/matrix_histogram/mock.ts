/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_INDEX_PATTERN } from '../../../common/constants';
import { HistogramType } from '../../graphql/types';

export const mockAlertsHistogramDataResponse = {
  took: 513,
  timed_out: false,
  _shards: {
    total: 62,
    successful: 61,
    skipped: 0,
    failed: 1,
    failures: [
      {
        shard: 0,
        index: 'auditbeat-7.2.0',
        node: 'jBC5kcOeT1exvECDMrk5Ug',
        reason: {
          type: 'illegal_argument_exception',
          reason:
            'Fielddata is disabled on text fields by default. Set fielddata=true on [event.module] in order to load fielddata in memory by uninverting the inverted index. Note that this can however use significant memory. Alternatively use a keyword field instead.',
        },
      },
    ],
  },
  hits: {
    total: {
      value: 1599508,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    alertsGroup: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 802087,
      buckets: [
        {
          key: 'All others',
          doc_count: 451519,
          alerts: {
            buckets: [
              {
                key_as_string: '2019-12-15T09:30:00.000Z',
                key: 1576402200000,
                doc_count: 3008,
              },
              {
                key_as_string: '2019-12-15T10:00:00.000Z',
                key: 1576404000000,
                doc_count: 8671,
              },
            ],
          },
        },
        {
          key: 'suricata',
          doc_count: 345902,
          alerts: {
            buckets: [
              {
                key_as_string: '2019-12-15T09:30:00.000Z',
                key: 1576402200000,
                doc_count: 1785,
              },
              {
                key_as_string: '2019-12-15T10:00:00.000Z',
                key: 1576404000000,
                doc_count: 5342,
              },
            ],
          },
        },
      ],
    },
  },
};
export const mockAlertsHistogramDataFormattedResponse = [
  {
    x: 1576402200000,
    y: 3008,
    g: 'All others',
  },
  {
    x: 1576404000000,
    y: 8671,
    g: 'All others',
  },
  {
    x: 1576402200000,
    y: 1785,
    g: 'suricata',
  },
  {
    x: 1576404000000,
    y: 5342,
    g: 'suricata',
  },
];
export const mockAlertsHistogramQueryDsl = 'mockAlertsHistogramQueryDsl';
export const mockRequest = 'mockRequest';
export const mockOptions = {
  sourceConfiguration: { field: {} },
  timerange: {
    to: 9999,
    from: 1234,
  },
  defaultIndex: DEFAULT_INDEX_PATTERN,
  filterQuery: '',
  stackByField: 'event.module',
  histogramType: HistogramType.alerts,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Aggregation } from '../../modules/indicators/services/fetch_aggregated_indicators';
import { convertAggregationToChartSeries } from './barchart';

const aggregation1: Aggregation = {
  events: {
    buckets: [
      {
        doc_count: 0,
        key: 1641016800000,
        key_as_string: '1 Jan 2022 06:00:00 GMT',
      },
      {
        doc_count: 10,
        key: 1641038400000,
        key_as_string: '1 Jan 2022 12:00:00 GMT',
      },
    ],
  },
  doc_count: 0,
  key: '[Filebeat] AbuseCH Malware',
};
const aggregation2: Aggregation = {
  events: {
    buckets: [
      {
        doc_count: 20,
        key: 1641016800000,
        key_as_string: '1 Jan 2022 06:00:00 GMT',
      },
      {
        doc_count: 8,
        key: 1641038400000,
        key_as_string: '1 Jan 2022 12:00:00 GMT',
      },
    ],
  },
  doc_count: 0,
  key: '[Filebeat] AbuseCH MalwareBazaar',
};

describe('barchart', () => {
  describe('convertAggregationToChartSeries', () => {
    it('should convert Aggregation[] to ChartSeries[]', () => {
      expect(convertAggregationToChartSeries([aggregation1, aggregation2])).toEqual([
        {
          x: '1 Jan 2022 06:00:00 GMT',
          y: 0,
          g: '[Filebeat] AbuseCH Malware',
        },
        {
          x: '1 Jan 2022 12:00:00 GMT',
          y: 10,
          g: '[Filebeat] AbuseCH Malware',
        },
        {
          x: '1 Jan 2022 06:00:00 GMT',
          y: 20,
          g: '[Filebeat] AbuseCH MalwareBazaar',
        },
        {
          x: '1 Jan 2022 12:00:00 GMT',
          y: 8,
          g: '[Filebeat] AbuseCH MalwareBazaar',
        },
      ]);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApmDataSource } from '../data_source';
import { ApmDocumentType } from '../document_type';
import { RollupInterval } from '../rollup';
import {
  getPreferredBucketSizeAndDataSource,
  intervalToSeconds,
} from './get_preferred_bucket_size_and_data_source';

const serviceTransactionMetricSources: ApmDataSource[] = [
  {
    documentType: ApmDocumentType.ServiceTransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
  },
  {
    documentType: ApmDocumentType.ServiceTransactionMetric,
    rollupInterval: RollupInterval.TenMinutes,
  },
  {
    documentType: ApmDocumentType.ServiceTransactionMetric,
    rollupInterval: RollupInterval.SixtyMinutes,
  },
];

const txMetricSources: ApmDataSource[] = [
  {
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
  },
  {
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.TenMinutes,
  },
  {
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.SixtyMinutes,
  },
];

const txEventSources: ApmDataSource[] = [
  {
    documentType: ApmDocumentType.TransactionEvent,
    rollupInterval: RollupInterval.None,
  },
];

describe('getPreferredBucketSizeAndDataSource', () => {
  const tests: Array<{ in: string; out: string }> = [
    { in: '30s', out: '1m' },
    { in: '60s', out: '60s' },
    { in: '10m', out: '10m' },
    { in: '30m', out: '10m' },
    { in: '60m', out: '60m' },
    { in: '120m', out: '60m' },
  ];

  tests.forEach((test) => {
    it(`${test.in} => ${test.out}`, () => {
      const { source, bucketSizeInSeconds } =
        getPreferredBucketSizeAndDataSource({
          sources: [
            ...serviceTransactionMetricSources,
            ...txMetricSources,
            ...txEventSources,
          ],
          bucketSizeInSeconds: intervalToSeconds(test.in),
        });

      expect(source.documentType).toBe(
        ApmDocumentType.ServiceTransactionMetric
      );

      expect(intervalToSeconds(source.rollupInterval)).toBe(
        intervalToSeconds(test.out)
      );

      expect(bucketSizeInSeconds).toBeGreaterThanOrEqual(
        intervalToSeconds(test.out)
      );
    });
  });
});

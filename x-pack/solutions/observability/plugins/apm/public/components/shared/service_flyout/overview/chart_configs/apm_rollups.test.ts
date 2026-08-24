/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmDocumentType } from '../../../../../../common/document_type';
import { RollupInterval } from '../../../../../../common/rollup';
import { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import {
  buildApmRollupErrorRateQuery,
  buildApmRollupLatencyQuery,
  buildApmRollupThroughputQuery,
  isApmRollupDocumentType,
} from './apm_rollups';
import type { ApmRollupSource } from './apm_rollups';
import { printQuery } from './shared';

const INDICES = 'metrics-apm*';

const SCOPE = {
  serviceName: 'opbeans-java',
  environment: 'production',
  transactionType: 'request',
};

const SERVICE_TRANSACTION_SOURCE: ApmRollupSource = {
  documentType: ApmDocumentType.ServiceTransactionMetric,
  rollupInterval: RollupInterval.TenMinutes,
  bucketSizeInSeconds: 600,
};

const TRANSACTION_SOURCE: ApmRollupSource = {
  documentType: ApmDocumentType.TransactionMetric,
  rollupInterval: RollupInterval.OneMinute,
  bucketSizeInSeconds: 60,
};

describe('APM rollup chart configs', () => {
  describe('isApmRollupDocumentType', () => {
    it.each([ApmDocumentType.ServiceTransactionMetric, ApmDocumentType.TransactionMetric])(
      'accepts %s',
      (documentType) => {
        expect(isApmRollupDocumentType(documentType)).toBe(true);
      }
    );

    it.each([ApmDocumentType.TransactionEvent, ApmDocumentType.SpanEvent])(
      'rejects %s',
      (documentType) => {
        expect(isApmRollupDocumentType(documentType)).toBe(false);
      }
    );
  });

  describe('buildApmRollupLatencyQuery', () => {
    it('averages the duration summary for avg latency', () => {
      const query = buildApmRollupLatencyQuery({
        indices: INDICES,
        scope: SCOPE,
        source: SERVICE_TRANSACTION_SOURCE,
        latencyAggregationType: LatencyAggregationType.avg,
      });

      expect(printQuery(query)).toEqual(
        'FROM metrics-apm* | WHERE `processor.event` == "metric" | WHERE `metricset.name` == "service_transaction" | WHERE `metricset.interval` == "10m" | WHERE `transaction.type` == "request" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | STATS duration_us = AVG(transaction.duration.summary) BY timestamp = TBUCKET(600 seconds) | EVAL latency = duration_us / 1000 | KEEP timestamp, latency | SORT timestamp'
      );
    });

    it.each([
      [LatencyAggregationType.p95, 95],
      [LatencyAggregationType.p99, 99],
    ])(
      'reads percentiles from the duration histogram for %s',
      (latencyAggregationType, percent) => {
        const query = buildApmRollupLatencyQuery({
          indices: INDICES,
          scope: SCOPE,
          source: SERVICE_TRANSACTION_SOURCE,
          latencyAggregationType,
        });

        expect(printQuery(query)).toContain(
          `STATS duration_us = PERCENTILE(transaction.duration.histogram::TDIGEST, ${percent})`
        );
      }
    );

    it('scopes transaction rollups by their own metricset name and interval', () => {
      const query = buildApmRollupLatencyQuery({
        indices: INDICES,
        scope: SCOPE,
        source: TRANSACTION_SOURCE,
        latencyAggregationType: LatencyAggregationType.avg,
      });

      expect(printQuery(query)).toContain('WHERE `metricset.name` == "transaction"');
      expect(printQuery(query)).toContain('WHERE `metricset.interval` == "1m"');
    });
  });

  describe('buildApmRollupThroughputQuery', () => {
    it('counts transactions from the duration summary and reports them per minute', () => {
      const query = buildApmRollupThroughputQuery({
        indices: INDICES,
        scope: SCOPE,
        source: SERVICE_TRANSACTION_SOURCE,
      });

      expect(printQuery(query)).toContain(
        'STATS transactions = COUNT(transaction.duration.summary) BY timestamp = TBUCKET(600 seconds) | EVAL throughput = TO_DOUBLE(transactions) / 10 | KEEP timestamp, throughput | SORT timestamp'
      );
    });
  });

  describe('buildApmRollupErrorRateQuery', () => {
    it('derives the failure ratio from event.success_count for service transaction rollups', () => {
      const query = buildApmRollupErrorRateQuery({
        indices: INDICES,
        scope: SCOPE,
        source: SERVICE_TRANSACTION_SOURCE,
      });

      expect(printQuery(query)).toContain(
        'STATS successful = SUM(event.success_count), all = COUNT(event.success_count) BY timestamp = TBUCKET(600 seconds) | EVAL failed_transaction_rate = CASE(all > 0, TO_DOUBLE(all - successful) / all, NULL) | KEEP timestamp, failed_transaction_rate | SORT timestamp'
      );
    });

    it('weights the outcome counts by transaction count for transaction rollups', () => {
      const query = buildApmRollupErrorRateQuery({
        indices: INDICES,
        scope: SCOPE,
        source: TRANSACTION_SOURCE,
      });

      expect(printQuery(query)).toContain(
        'STATS failure = COUNT(transaction.duration.summary) WHERE TO_STRING(event.outcome) == "failure", all = COUNT(transaction.duration.summary) WHERE (TO_STRING(event.outcome) IN ("failure", "success")) BY timestamp = TBUCKET(60 seconds) | EVAL failed_transaction_rate = CASE(all > 0, TO_DOUBLE(failure) / all, NULL)'
      );
    });
  });
});

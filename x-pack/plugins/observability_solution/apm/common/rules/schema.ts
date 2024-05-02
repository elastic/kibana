/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { AnomalyDetectorType } from '../anomaly_detection/apm_ml_detectors';
import { AggregationType } from './apm_rule_types';

export const searchConfigurationSchema = schema.object({
  query: schema.object({
    query: schema.oneOf([schema.string(), schema.recordOf(schema.string(), schema.any())]),
    language: schema.string(),
  }),
});

export const errorCountParamsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  errorGroupingKey: schema.maybe(schema.string()),
  useKqlFilter: schema.maybe(schema.boolean()),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

export const transactionDurationParamsSchema = schema.object({
  serviceName: schema.maybe(schema.string()),
  transactionType: schema.maybe(schema.string()),
  transactionName: schema.maybe(schema.string()),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  aggregationType: schema.oneOf([
    schema.literal(AggregationType.Avg),
    schema.literal(AggregationType.P95),
    schema.literal(AggregationType.P99),
  ]),
  environment: schema.string(),
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  useKqlFilter: schema.maybe(schema.boolean()),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

const detectorsSchema = schema.oneOf([
  schema.literal(AnomalyDetectorType.txLatency),
  schema.literal(AnomalyDetectorType.txThroughput),
  schema.literal(AnomalyDetectorType.txFailureRate),
]);

export const anomalyParamsSchema = schema.object({
  serviceName: schema.maybe(schema.string()),
  transactionType: schema.maybe(schema.string()),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  environment: schema.string(),
  anomalySeverityType: schema.oneOf([
    schema.literal(ML_ANOMALY_SEVERITY.CRITICAL),
    schema.literal(ML_ANOMALY_SEVERITY.MAJOR),
    schema.literal(ML_ANOMALY_SEVERITY.MINOR),
    schema.literal(ML_ANOMALY_SEVERITY.WARNING),
  ]),
  anomalyDetectorTypes: schema.maybe(schema.arrayOf(detectorsSchema, { minSize: 1 })),
});

export const transactionErrorRateParamsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  transactionType: schema.maybe(schema.string()),
  transactionName: schema.maybe(schema.string()),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  useKqlFilter: schema.maybe(schema.boolean()),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

type ErrorCountParamsType = TypeOf<typeof errorCountParamsSchema>;
type TransactionDurationParamsType = TypeOf<typeof transactionDurationParamsSchema>;
type AnomalyParamsType = TypeOf<typeof anomalyParamsSchema>;
type TransactionErrorRateParamsType = TypeOf<typeof transactionErrorRateParamsSchema>;

export type SearchConfigurationType = TypeOf<typeof searchConfigurationSchema>;

export interface ApmRuleParamsType {
  [ApmRuleType.TransactionDuration]: TransactionDurationParamsType;
  [ApmRuleType.ErrorCount]: ErrorCountParamsType;
  [ApmRuleType.Anomaly]: AnomalyParamsType;
  [ApmRuleType.TransactionErrorRate]: TransactionErrorRateParamsType;
}

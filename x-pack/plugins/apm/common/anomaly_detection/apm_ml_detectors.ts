/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { findKey } from 'lodash';
import { ApmMlJobType } from './apm_ml_job';

export const enum ApmMlDetectorType {
  txLatency = 'txLatency',
  txThroughput = 'txThroughput',
  txFailureRate = 'txFailureRate',
  spanLatency = 'spanLatency',
  spanThroughput = 'spanThroughput',
  spanFailureRate = 'spanFailureRate',
}

export function getAnomalyDetectorLabel(type: ApmMlDetectorType): string {
  switch (type) {
    case ApmMlDetectorType.txLatency:
      return i18n.translate(
        'xpack.apm.anomalyDetection.detectorLabelTxLatency',
        { defaultMessage: 'Transaction latency' }
      );
    case ApmMlDetectorType.txThroughput:
      return i18n.translate(
        'xpack.apm.anomalyDetection.detectorLabelTxThroughput',
        { defaultMessage: 'Transaction throughput' }
      );
    case ApmMlDetectorType.txFailureRate:
      return i18n.translate(
        'xpack.apm.anomalyDetection.detectorLabelTxFailureRate',
        { defaultMessage: 'Transaction failure rate' }
      );
    case ApmMlDetectorType.spanLatency:
      return i18n.translate(
        'xpack.apm.anomalyDetection.detectorLabelSpanLatency',
        { defaultMessage: 'Span latency' }
      );
    case ApmMlDetectorType.spanThroughput:
      return i18n.translate(
        'xpack.apm.anomalyDetection.detectorLabelSpanThroughput',
        { defaultMessage: 'Span throughput' }
      );
    case ApmMlDetectorType.spanFailureRate:
      return i18n.translate(
        'xpack.apm.anomalyDetection.detectorLabelSpanFailureRate',
        { defaultMessage: 'Span failure rate' }
      );
  }
}
const transactionDetectorIndices = {
  [ApmMlDetectorType.txLatency]: 0,
  [ApmMlDetectorType.txThroughput]: 1,
  [ApmMlDetectorType.txFailureRate]: 2,
};

const spanDetectorIndices = {
  [ApmMlDetectorType.spanLatency]: 0,
  [ApmMlDetectorType.spanThroughput]: 1,
  [ApmMlDetectorType.spanFailureRate]: 2,
};

const detectorIndices = {
  ...transactionDetectorIndices,
  ...spanDetectorIndices,
};

export function getApmMlDetectorIndex(type: ApmMlDetectorType) {
  return detectorIndices[type];
}

export function getApmMlDetectorType({
  jobId,
  detectorIndex,
}: {
  jobId: string;
  detectorIndex: number;
}) {
  const indices = jobId.includes(ApmMlJobType.SpanMetrics)
    ? spanDetectorIndices
    : transactionDetectorIndices;

  const type = findKey(indices, (value) => value === detectorIndex) as
    | ApmMlDetectorType
    | undefined;

  if (type) {
    return type;
  }
  throw new Error('Could not map detector index to type');
}

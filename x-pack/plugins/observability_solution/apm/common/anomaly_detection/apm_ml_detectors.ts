/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AnomalyDetectorType {
  txLatency = 'txLatency',
  txThroughput = 'txThroughput',
  txFailureRate = 'txFailureRate',
}

const detectorIndices = {
  [AnomalyDetectorType.txLatency]: 0,
  [AnomalyDetectorType.txThroughput]: 1,
  [AnomalyDetectorType.txFailureRate]: 2,
};

export function getAnomalyDetectorIndex(type: AnomalyDetectorType) {
  return detectorIndices[type];
}

export function getAnomalyDetectorType(detectorIndex: number) {
  let type: AnomalyDetectorType;
  for (type in detectorIndices) {
    if (detectorIndices[type] === detectorIndex) {
      return type;
    }
  }
  throw new Error('Could not map detector index to type');
}

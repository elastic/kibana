/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const enum ApmMlDetectorType {
  txLatency = 'txLatency',
  txThroughput = 'txThroughput',
  txFailureRate = 'txFailureRate',
}

const detectorIndices = {
  [ApmMlDetectorType.txLatency]: 0,
  [ApmMlDetectorType.txThroughput]: 1,
  [ApmMlDetectorType.txFailureRate]: 2,
};

export function getApmMlDetectorIndex(type: ApmMlDetectorType) {
  return detectorIndices[type];
}

export function getApmMlDetectorType(detectorIndex: number) {
  let type: ApmMlDetectorType;
  for (type in detectorIndices) {
    if (detectorIndices[type] === detectorIndex) {
      return type;
    }
  }
  throw new Error('Could not map detector index to type');
}

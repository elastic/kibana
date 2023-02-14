/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmMlModule } from './apm_ml_module';

export enum ApmMlDetectorType {
  txLatency = 'txLatency',
  txThroughput = 'txThroughput',
  txFailureRate = 'txFailureRate',
  serviceDestinationLatency = 'serviceDestinationLatency',
  serviceDestinationThroughput = 'serviceDestinationThroughput',
  serviceDestinationFailureRate = 'serviceDestinationFailureRate',
}

const DETECTOR_INDICES_BY_MODULE = {
  [ApmMlModule.ServiceDestination]: [
    ApmMlDetectorType.serviceDestinationLatency,
    ApmMlDetectorType.serviceDestinationThroughput,
    ApmMlDetectorType.serviceDestinationFailureRate,
  ],
  [ApmMlModule.Transaction]: [
    ApmMlDetectorType.txLatency,
    ApmMlDetectorType.txThroughput,
    ApmMlDetectorType.txFailureRate,
  ],
};

export function getApmMlDetectorIndex(type: ApmMlDetectorType) {
  const entries = Object.entries(DETECTOR_INDICES_BY_MODULE);

  for (const [_, detectors] of entries) {
    const index = detectors.indexOf(type);
    if (index !== -1) {
      return index;
    }
  }

  throw new Error(`Could not find detector index for ${type}`);
}

export function getApmMlDetectorType({
  detectorIndex,
  module,
}: {
  detectorIndex: number;
  module: ApmMlModule;
}) {
  const detectorType = DETECTOR_INDICES_BY_MODULE[module][detectorIndex];

  if (!detectorType) {
    throw new Error(
      `Could not determine detector type for detectorIndex ${detectorIndex} of module ${module}`
    );
  }

  return detectorType;
}

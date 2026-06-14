/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GCS_BUCKET, RE2OB_GCS_BASE_PATH } from './constants';
import type { RcaScenario } from './types';

const FAULT_DESCRIPTIONS: Record<string, string> = {
  cpu: 'CPU stress injection — high CPU load on the target service',
  mem: 'Memory pressure injection — memory exhaustion on the target service',
  disk: 'Disk I/O saturation — heavy disk read/write load on the target service',
  delay: 'Network delay injection — artificial latency added to service traffic',
  loss: 'Packet loss injection — intermittent network packet drops on the target service',
  socket: 'Socket exhaustion — connection/socket resource limits reached on the target service',
};

function scenario(service: string, faultType: string): RcaScenario {
  return {
    snapshotName: `${service}-${faultType}`,
    service,
    faultType,
    faultDescription: FAULT_DESCRIPTIONS[faultType] ?? `fault type: ${faultType}`,
    gcs: { bucket: GCS_BUCKET, basePath: RE2OB_GCS_BASE_PATH },
  };
}

/**
 * Scenarios with local CSV data extracted from the RCAEval RE2-OB Zenodo dataset.
 * Add a row here + capture a GCS snapshot (scripts/capture_re2ob_snapshot) to
 * include a scenario in CI. Local runs only need RCAEVAL_DATA_DIR to point at the
 * extracted RE2-OB directory.
 */
export const RE2OB_SCENARIOS: RcaScenario[] = [
  scenario('currencyservice', 'loss'),
  scenario('checkoutservice', 'delay'),
  scenario('checkoutservice', 'mem'),
  scenario('emailservice', 'cpu'),
  scenario('productcatalogservice', 'cpu'),
  scenario('recommendationservice', 'socket'),
];

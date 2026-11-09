/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerInvestigationEvaluation } from './register_evaluation';
import { loadOrcaDataset, resolveOrcaRun, resolveOrcaTelemetryVariant } from './orca_dataset';

const run = resolveOrcaRun();
const telemetryVariant = resolveOrcaTelemetryVariant();
const { release, slice } = run;

registerInvestigationEvaluation({
  name: 'orcabench',
  loadDataset: (client) => loadOrcaDataset(client, run),
  // Execute exactly the fetched, validated snapshot rather than resolving mutable contents again.
  trustUpstreamDataset: false,
  orca: true,
  metadata: {
    dataset_release: release.name,
    dataset_sha256: release.sha256,
    source_release: 'data-0418/2026-10-01',
    telemetry_variant: telemetryVariant,
    ...(slice ? { dataset_slice: `${slice.index}/${slice.count}` } : {}),
  },
});

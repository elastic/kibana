/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerInvestigationEvaluation } from './register_evaluation';
import { ORCA_DEMO_COMMIT } from './custom_context';
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
    // Each task reads through a key whose document-level security ends at its snapshot, so these
    // runs never mix with the proxy-bounded baseline or unbounded runs.
    telemetry_cutoff: 'dls',
    // The agent may read the demo's source at the commit the paper pins, through custom context.
    source_code: `opentelemetry-demo@${ORCA_DEMO_COMMIT}`,
    ...(slice ? { dataset_slice: `${slice.index}/${slice.count}` } : {}),
  },
});

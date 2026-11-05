/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerInvestigationEvaluation } from './register_evaluation';
import { loadOrcaDataset, ORCA_RELEASE } from './orca_dataset';

registerInvestigationEvaluation({
  name: 'orcabench',
  loadDataset: loadOrcaDataset,
  // Execute exactly the fetched, validated snapshot rather than resolving mutable contents again.
  trustUpstreamDataset: false,
  orca: true,
  metadata: {
    dataset_release: ORCA_RELEASE.name,
    dataset_sha256: ORCA_RELEASE.sha256,
    source_release: 'data-0418/2026-10-01',
  },
});

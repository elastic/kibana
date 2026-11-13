/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertStoredDatasetTags,
  resolveEvalSelection,
  selectStoredDatasets,
} from '../../src/datasets';
import { loadStoredInvestigationDataset } from './datasets';
import { registerInvestigationEvaluation } from './register_evaluation';

// One evaluation per stored investigation dataset in STORED_DATASETS that this run selected.
for (const storedDataset of selectStoredDatasets(
  'investigation',
  resolveEvalSelection().storedDatasetIds
)) {
  registerInvestigationEvaluation({
    name: storedDataset.id,
    experimentName: `Nightshift stored investigation traces: ${storedDataset.id}`,
    loadDataset: async (client) => {
      const dataset = await loadStoredInvestigationDataset(client, storedDataset.name);
      assertStoredDatasetTags(storedDataset, dataset.tags);
      return dataset;
    },
    // Like NIGHTSHIFT_DATASET_NAME: run the upstream copy, keeping its example ids and labels.
    trustUpstreamDataset: true,
    // Live investigations: they get the stack's connectors and need no sandbox calculation.
    bundledSynthetic: false,
  });
}

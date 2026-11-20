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
import { loadStoredInvestigationDataset } from '../investigation/datasets';
import { registerConnectorProbeEvaluation } from './register_evaluation';

// One evaluation per stored connector probe dataset in STORED_DATASETS that this run selected.
// Probes share the investigation example format, so they load and validate the same way.
for (const storedDataset of selectStoredDatasets(
  'connector-probe',
  resolveEvalSelection().storedDatasetIds
)) {
  registerConnectorProbeEvaluation({
    name: storedDataset.id,
    experimentName: `Nightshift assistant stored connector probes: ${storedDataset.id}`,
    loadDataset: async (client) => {
      const dataset = await loadStoredInvestigationDataset(client, storedDataset.name);
      assertStoredDatasetTags(storedDataset, dataset.tags);
      return dataset;
    },
    // Like NIGHTSHIFT_DATASET_NAME: run the upstream copy, keeping its example ids and labels.
    trustUpstreamDataset: true,
  });
}

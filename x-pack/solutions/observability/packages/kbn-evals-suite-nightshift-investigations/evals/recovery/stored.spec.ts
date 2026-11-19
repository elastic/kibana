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
import { registerInvestigationEvaluation } from '../investigation/register_evaluation';
import { prepareRecoveryExample } from './compose';
import { readRecoveryExamplesFile } from './datasets';
import { createRecoveryEvaluators } from './judges';

// A recovery dataset holds customer telemetry, so it lives on the evaluations cluster, not in the
// repository. Setting NIGHTSHIFT_RECOVERY_EXAMPLES_FILE registers (upserts) it from that file under
// its entry's `name`; without it the run scores the dataset already stored under that name.
const examplesFile = process.env.NIGHTSHIFT_RECOVERY_EXAMPLES_FILE;

for (const storedDataset of selectStoredDatasets(
  'recovery',
  resolveEvalSelection().storedDatasetIds
)) {
  registerInvestigationEvaluation({
    name: storedDataset.id,
    experimentName: `Nightshift alert-recovery rounds: ${storedDataset.id}`,
    loadDataset: async (client) => {
      const dataset = examplesFile
        ? readRecoveryExamplesFile(examplesFile, storedDataset.name)
        : await loadStoredInvestigationDataset(client, storedDataset.name);
      assertStoredDatasetTags(storedDataset, dataset.tags);
      return dataset;
    },
    // The stored copy keeps its example ids; a file is upserted by the run that scores it.
    trustUpstreamDataset: !examplesFile,
    bundledSynthetic: false,
    prepareExample: prepareRecoveryExample,
    extraEvaluators: createRecoveryEvaluators,
    // It scores evidence after the resolution as leakage, which a recovery round is meant to read.
    excludeEvaluators: ['rca_anti_leakage'],
  });
}

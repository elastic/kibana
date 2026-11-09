/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Which evals and stored datasets a run selects. Individual datasets are declared by the eval
 * that scores them, under `evals/<name>/datasets.ts`.
 */

export { resolveEvalSelection, INVESTIGATION_DATASET_ID } from './eval_selection';
export type { EvalSelection } from './eval_selection';
export { STORED_DATASETS, assertStoredDatasetTags, selectStoredDatasets } from './stored_datasets';
export type { StoredDataset, StoredDatasetEval } from './stored_datasets';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetConfig } from '../../src/datasets';

export interface ProbeDatasetPlan {
  datasetsToProbe: DatasetConfig[];
  unsupportedDatasetsMessage?: string;
}

export const planProbeDatasets = (datasets: DatasetConfig[]): ProbeDatasetPlan => {
  const datasetsToProbe = datasets.filter(({ replayMode }) => replayMode !== 'managed-stream');
  const unsupportedDatasetIds = datasets
    .filter(({ replayMode }) => replayMode === 'managed-stream')
    .map(({ id }) => id);

  if (unsupportedDatasetIds.length === 0) {
    return { datasetsToProbe };
  }

  return {
    datasetsToProbe,
    unsupportedDatasetsMessage: `probe_eval_snapshot does not support datasets with replayMode "managed-stream": ${unsupportedDatasetIds.join(
      ', '
    )}.`,
  };
};

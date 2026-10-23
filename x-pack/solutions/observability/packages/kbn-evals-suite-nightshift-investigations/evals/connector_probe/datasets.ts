/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset } from '@kbn/evals';
import { DatasetTags } from '@kbn/evals-common';
import { readInvestigationFile } from '../investigation/datasets';
import type { ConnectorProbeExample } from './types';

/** Loads the probe questions from `NIGHTSHIFT_PROBE_EXAMPLES_FILE`; probes are not bundled. */
export const readConnectorProbeDataset = (
  path = process.env.NIGHTSHIFT_PROBE_EXAMPLES_FILE
): EvaluationDataset<ConnectorProbeExample> => {
  if (!path) {
    throw new Error('Set NIGHTSHIFT_PROBE_EXAMPLES_FILE to a connector probe examples file');
  }
  const file = readInvestigationFile(path);
  return {
    name: file.dataset,
    description: file.description ?? 'Direct telemetry questions for the Nightshift assistant.',
    tags: DatasetTags.parse([...new Set(['nightshift', 'connector-probe', ...file.tags])]),
    examples: file.examples,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readConnectorProbeDataset } from './datasets';
import { registerConnectorProbeEvaluation } from './register_evaluation';

registerConnectorProbeEvaluation({
  name: 'connector probes',
  loadDataset: async () => readConnectorProbeDataset(),
});

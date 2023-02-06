/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipelineParams } from '../../../../common/types/connectors';

export const mockPipelineState: IngestPipelineParams = {
  extract_binary_content: true,
  name: 'pipeline-name',
  reduce_whitespace: true,
  run_ml_inference: true,
};

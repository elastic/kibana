/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

// Separate config path from the Jina run so Buildkite's per-config
// "already executed" metadata does not skip the second model.
// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  process.env.INFERENCE_ID ||= defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID;
  process.env.OPENAPI_INFERENCE_ID ||= process.env.INFERENCE_ID;

  const generateArtifactsConfig = await readConfigFile(
    require.resolve('./generate_artifacts.config.ts')
  );
  return generateArtifactsConfig.getAll();
}

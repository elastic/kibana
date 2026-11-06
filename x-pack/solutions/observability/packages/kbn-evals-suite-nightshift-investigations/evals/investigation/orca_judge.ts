/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector, InferenceEndpointDefinition } from '@kbn/evals';
import { isInferenceEndpointDefinition, loadInferenceEndpoints } from '@kbn/evals';

/** EIS connector id for openai-gpt-5.4, also the orcabench shard's `judge` in evals.suites.json. */
export const ORCA_JUDGE_CONNECTOR_ID = 'eis-openai-gpt-5-4';

const ORCA_JUDGE_MODEL_ID = 'openai-gpt-5.4';

/** The connector fixture swaps an endpoint's `id` for its inference id, so match on the model too. */
const isOrcaJudge = (connector: EvalConnector): boolean =>
  connector.id === ORCA_JUDGE_CONNECTOR_ID ||
  (isInferenceEndpointDefinition(connector) &&
    connector.provider === 'elastic' &&
    connector.providerConfig?.model_id === ORCA_JUDGE_MODEL_ID);

/** The connector ORCA judges bind to, using the fixture when it is already this model. */
export const orcaJudgeConnector = (
  connector: EvalConnector,
  endpoints: InferenceEndpointDefinition[] = loadInferenceEndpoints()
): EvalConnector => {
  if (isOrcaJudge(connector)) return connector;
  const endpoint = endpoints.find(({ id }) => id === ORCA_JUDGE_CONNECTOR_ID);
  if (!endpoint) {
    throw new Error(
      `ORCA judges need ${ORCA_JUDGE_CONNECTOR_ID}: set EVAL_CONNECTOR_ID to it or add it to KIBANA_TESTING_INFERENCE_ENDPOINTS`
    );
  }
  // Inference clients address an endpoint by its inference id.
  return { ...endpoint, id: endpoint.inferenceId };
};

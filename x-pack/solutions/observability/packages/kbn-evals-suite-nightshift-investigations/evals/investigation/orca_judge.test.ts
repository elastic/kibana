/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector, InferenceEndpointDefinition } from '@kbn/evals';
import { ORCA_JUDGE_CONNECTOR_ID, orcaJudgeConnector } from './orca_judge';

const INFERENCE_ID = '.openai-gpt-5.4-chat_completion';

const endpoint: InferenceEndpointDefinition = {
  type: 'inference_endpoint',
  id: ORCA_JUDGE_CONNECTOR_ID,
  name: 'EIS openai-gpt-5.4',
  inferenceId: INFERENCE_ID,
  provider: 'elastic',
  taskType: 'chat_completion',
  providerConfig: { model_id: 'openai-gpt-5.4' },
};

const otherModel: InferenceEndpointDefinition = {
  ...endpoint,
  id: '.other-model',
  inferenceId: '.other-model',
  providerConfig: { model_id: 'other-model' },
};

describe('orcaJudgeConnector', () => {
  it('keeps the judge endpoint after the fixture rebinds its id to the inference id', () => {
    const rebound: EvalConnector = { ...endpoint, id: INFERENCE_ID };
    expect(orcaJudgeConnector(rebound, [])).toBe(rebound);
  });

  it('keeps a connector that already has the judge id', () => {
    expect(orcaJudgeConnector(endpoint, [])).toBe(endpoint);
  });

  it('binds another evaluation connector to the judge inference id, not its config alias', () => {
    expect(orcaJudgeConnector(otherModel, [otherModel, endpoint])).toMatchObject({
      id: INFERENCE_ID,
      inferenceId: INFERENCE_ID,
    });
  });

  it('fails before judging when the judge endpoint is not configured', () => {
    expect(() => orcaJudgeConnector(otherModel, [otherModel])).toThrow(ORCA_JUDGE_CONNECTOR_ID);
  });
});

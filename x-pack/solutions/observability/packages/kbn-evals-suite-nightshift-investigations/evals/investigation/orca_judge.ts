/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector } from '@kbn/evals';

/** EIS connector for `openai-gpt-5.4`. ORCA's judge is this model; the agent model is not. */
export const ORCA_JUDGE_CONNECTOR_ID = 'eis-openai-gpt-5-4';

/** The connector ORCA judges bind to, using the fixture when it is already this id. */
export const orcaJudgeConnector = (connector: EvalConnector): EvalConnector =>
  connector.id === ORCA_JUDGE_CONNECTOR_ID
    ? connector
    : {
        type: 'inference_endpoint',
        id: ORCA_JUDGE_CONNECTOR_ID,
        name: 'EIS openai-gpt-5.4',
        inferenceId: ORCA_JUDGE_CONNECTOR_ID,
        provider: 'elastic',
        taskType: 'chat_completion',
        providerConfig: { model_id: 'openai-gpt-5.4' },
      };

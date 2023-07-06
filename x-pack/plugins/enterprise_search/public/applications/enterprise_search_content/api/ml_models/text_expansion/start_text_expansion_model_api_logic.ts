/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ELSER_MODEL_ID } from '../../../../../../common/ml_inference_pipeline';
import { Actions, createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export type StartTextExpansionModelArgs = undefined;

export interface StartTextExpansionModelResponse {
  deploymentState: string;
  modelId: string;
}

export const startTextExpansionModel = async (): Promise<StartTextExpansionModelResponse> => {
  const route = `/internal/enterprise_search/ml/models/${ELSER_MODEL_ID}/deploy`;
  return await HttpLogic.values.http.post<StartTextExpansionModelResponse>(route, {
    body: undefined,
  });
};

export const StartTextExpansionModelApiLogic = createApiLogic(
  ['start_text_expansion_model_api_logic'],
  startTextExpansionModel,
  { showErrorFlash: false }
);

export type StartTextExpansionModelApiLogicActions = Actions<
  StartTextExpansionModelArgs,
  StartTextExpansionModelResponse
>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ELSER_MODEL_ID } from '../../../../../../common/ml_inference_pipeline';
import { Actions, createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export type CreateTextExpansionModelArgs = undefined;

export interface CreateTextExpansionModelResponse {
  deploymentState: string;
  modelId: string;
}

export const createTextExpansionModel = async (): Promise<CreateTextExpansionModelResponse> => {
  const route = `/internal/enterprise_search/ml/models/${ELSER_MODEL_ID}`;
  return await HttpLogic.values.http.post<CreateTextExpansionModelResponse>(route, {
    body: undefined,
  });
};

export const CreateTextExpansionModelApiLogic = createApiLogic(
  ['create_text_expansion_model_api_logic'],
  createTextExpansionModel,
  { showErrorFlash: false }
);

export type CreateTextExpansionModelApiLogicActions = Actions<
  CreateTextExpansionModelArgs,
  CreateTextExpansionModelResponse
>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Actions, createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export interface StartE5MultilingualModelArgs {
  modelId: string;
}

export interface StartE5MultilingualModelResponse {
  deploymentState: string;
  modelId: string;
}

export const startE5MultilingualModel = async ({
  modelId,
}: StartE5MultilingualModelArgs): Promise<StartE5MultilingualModelResponse> => {
  const route = `/internal/enterprise_search/ml/models/${modelId}/deploy`;
  return await HttpLogic.values.http.post<StartE5MultilingualModelResponse>(route);
};

export const StartE5MultilingualModelApiLogic = createApiLogic(
  ['start_e5_multilingual_model_api_logic'],
  startE5MultilingualModel,
  { showErrorFlash: false }
);

export type StartE5MultilingualModelApiLogicActions = Actions<
  StartE5MultilingualModelArgs,
  StartE5MultilingualModelResponse
>;

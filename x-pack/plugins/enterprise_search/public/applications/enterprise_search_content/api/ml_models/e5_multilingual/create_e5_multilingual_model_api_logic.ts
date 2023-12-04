/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Actions, createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export interface CreateE5MultilingualModelArgs {
  modelId: string;
}

export interface CreateE5MultilingualModelResponse {
  deploymentState: string;
  modelId: string;
}

export const createE5MultilingualModel = async ({
  modelId,
}: CreateE5MultilingualModelArgs): Promise<CreateE5MultilingualModelResponse> => {
  const route = `/internal/enterprise_search/ml/models/${modelId}`;
  return await HttpLogic.values.http.post<CreateE5MultilingualModelResponse>(route);
};

export const CreateE5MultilingualModelApiLogic = createApiLogic(
  ['create_e5_multilingual_model_api_logic'],
  createE5MultilingualModel,
  { showErrorFlash: false }
);

export type CreateE5MultilingualModelApiLogicActions = Actions<
  CreateE5MultilingualModelArgs,
  CreateE5MultilingualModelResponse
>;

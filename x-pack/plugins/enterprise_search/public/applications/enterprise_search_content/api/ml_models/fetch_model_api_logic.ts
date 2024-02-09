/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MlModelDeploymentStatus } from '../../../../../common/types/ml';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchModelArgs {
  modelId: string;
}

export type FetchModelResponse = MlModelDeploymentStatus;

export const fetchModel = async ({ modelId }: FetchModelArgs) => {
  return await HttpLogic.values.http.get<FetchModelResponse>(
    `/internal/enterprise_search/ml/models/${modelId}`
  );
};

export const FetchModelApiLogic = createApiLogic(['fetch_model_api_logic'], fetchModel, {
  showErrorFlash: false,
});

export type FetchModelApiLogicActions = Actions<FetchModelArgs, FetchModelResponse>;

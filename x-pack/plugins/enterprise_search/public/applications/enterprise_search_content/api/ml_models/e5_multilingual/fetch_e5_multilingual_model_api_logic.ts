/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Actions, createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export interface FetchE5MultilingualModelArgs {
  modelId: string;
}

export interface FetchE5MultilingualModelResponse {
  deploymentState: string;
  modelId: string;
  targetAllocationCount: number;
  nodeAllocationCount: number;
  threadsPerAllocation: number;
}

export const fetchE5MultilingualModelStatus = async ({ modelId }: FetchE5MultilingualModelArgs) => {
  return await HttpLogic.values.http.get<FetchE5MultilingualModelResponse>(
    `/internal/enterprise_search/ml/models/${modelId}`
  );
};

export const FetchE5MultilingualModelApiLogic = createApiLogic(
  ['fetch_e5_multilingual_model_api_logic'],
  fetchE5MultilingualModelStatus,
  { showErrorFlash: false }
);

export type FetchE5MultilingualModelApiLogicActions = Actions<
  FetchE5MultilingualModelArgs,
  FetchE5MultilingualModelResponse
>;

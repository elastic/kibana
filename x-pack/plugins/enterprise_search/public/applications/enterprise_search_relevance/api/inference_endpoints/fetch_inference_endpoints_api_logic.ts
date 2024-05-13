/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchInferenceEndpointsResponse {
  inference_endpoints: InferenceAPIConfigResponse[];
}

export const fetchInferenceEndpoints = async (): Promise<FetchInferenceEndpointsResponse> => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/inference_endpoints';
  const response = await http.get<{
    inference_endpoints: InferenceAPIConfigResponse[];
  }>(route);

  return response;
};

export const FetchInferenceEndpointsAPILogic = createApiLogic(
  ['relevance', 'inference_endpoints_api_logic'],
  fetchInferenceEndpoints
);

export type FetchInferenceEdnpointsApiActions = Actions<void, FetchInferenceEndpointsResponse>;

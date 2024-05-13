/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { FetchInferenceEndpointsAPILogic } from '../../api/inference_endpoints/fetch_inference_endpoints_api_logic';
import { FetchInferenceEdnpointsApiActions as FetchInferenceEndpointsApiActions } from '../../api/inference_endpoints/fetch_inference_endpoints_api_logic';

export interface InferenceEndpointsActions {
  apiError: FetchInferenceEndpointsApiActions['apiError'];
  apiSuccess: FetchInferenceEndpointsApiActions['apiSuccess'];
  fetchInferenceEndpoints: () => void;
  makeRequest: FetchInferenceEndpointsApiActions['makeRequest'];
}
export interface InferenceEndpointsValues {
  data: typeof FetchInferenceEndpointsAPILogic.values.data;
  inferenceEndpoints: InferenceAPIConfigResponse[];
  status: typeof FetchInferenceEndpointsAPILogic.values.status;
}

export const InferenceEndpointsLogic = kea<
  MakeLogicType<InferenceEndpointsValues, InferenceEndpointsActions>
>({
  actions: {
    fetchInferenceEndpoints: true,
  },
  connect: {
    actions: [FetchInferenceEndpointsAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchInferenceEndpointsAPILogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    fetchInferenceEndpoints: async (_, breakpoint) => {
      await breakpoint(150);
      actions.makeRequest();
    },
  }),
  path: ['enterprise_search', 'relevance', 'inference_endpoints_logic'],
  selectors: ({ selectors }) => ({
    inferenceEndpoints: [
      () => [selectors.data],
      (data) => (data?.inference_endpoints ? data.inference_endpoints : []),
    ],
  }),
});

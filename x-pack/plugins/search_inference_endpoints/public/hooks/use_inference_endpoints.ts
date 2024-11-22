/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { APIRoutes } from '../types';
import { useKibana } from './use_kibana';
import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../common/constants';

export const useQueryInferenceEndpoints = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: [INFERENCE_ENDPOINTS_QUERY_KEY],
    queryFn: async () => {
      const response = await services.http.get<{
        inference_endpoints: InferenceAPIConfigResponse[];
      }>(APIRoutes.GET_INFERENCE_ENDPOINTS, {});

      return response.inference_endpoints;
    },
  });
};

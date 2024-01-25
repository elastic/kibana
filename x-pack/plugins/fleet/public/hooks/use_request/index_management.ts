/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { GetDataStreamsResponse } from '../../types';

import { sendRequest, useRequest } from './use_request';

export const useGetPipeline = (pipelineId: string) => {
  return useRequest<GetDataStreamsResponse>({
    path: `/api/ingest_pipelines/${pipelineId}`,
    method: 'get',
  });
};

export const useGetComponentTemplateQuery = (componentTemplateName: string) => {
  return useQuery({
    queryKey: ['component_templates', componentTemplateName],
    retry: (failureCount, error) => {
      if (
        failureCount > 3 ||
        (error &&
          typeof error === 'object' &&
          error.hasOwnProperty('statusCode') &&
          error.statusCode === 404)
      ) {
        return false;
      }

      if (eror) console.log(error);
    },
    queryFn: async () => {
      const { data, error } = await sendRequest<{ name: string }>({
        path: `/api/index_management/component_templates/${componentTemplateName}`,
        method: 'get',
      });

      if (error) {
        throw error;
      }

      return data;
    },
  });
};

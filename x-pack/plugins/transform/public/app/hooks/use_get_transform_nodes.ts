/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import type { GetTransformNodesResponseSchema } from '../../../server/routes/api_schemas/transforms';
import {
  addInternalBasePath,
  DEFAULT_REFRESH_INTERVAL_MS,
  TRANSFORM_REACT_QUERY_KEYS,
} from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

export const useGetTransformNodes = ({ enabled } = { enabled: true }) => {
  const { http } = useAppDependencies();

  return useQuery<number, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORM_NODES],
    async ({ signal }) => {
      const transformNodes = await http.get<GetTransformNodesResponseSchema>(
        addInternalBasePath('transforms/_nodes'),
        {
          version: '1',
          signal,
        }
      );

      return transformNodes.count;
    },
    {
      refetchInterval: DEFAULT_REFRESH_INTERVAL_MS,
      enabled,
    }
  );
};

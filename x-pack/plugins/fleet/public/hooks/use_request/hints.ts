/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hintsRouteService } from '../../services';

import type { GetHintsRequest, GetHintsResponse } from '../../types';

import { useRequest } from './use_request';
import type { UseRequestConfig } from './use_request';

type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;

export function useGetHints(query: GetHintsRequest['query'], options?: RequestOptions) {
  return useRequest<GetHintsResponse>({
    method: 'get',
    path: hintsRouteService.getListPath(),
    query,
    ...options,
  });
}

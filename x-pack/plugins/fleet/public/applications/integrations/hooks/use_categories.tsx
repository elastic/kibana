/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { RequestError } from '../../fleet/hooks';
import { sendRequestForRq } from '../../fleet/hooks';
import { epmRouteService } from '../services';
import type { GetCategoriesRequest, GetCategoriesResponse } from '../types';

export function useGetCategoriesQuery(query: GetCategoriesRequest['query'] = {}) {
  return useQuery(['categories', query], () =>
    sendRequestForRq<GetCategoriesResponse, RequestError>({
      path: epmRouteService.getCategoriesPath(),
      method: 'get',
      query,
    })
  );
}

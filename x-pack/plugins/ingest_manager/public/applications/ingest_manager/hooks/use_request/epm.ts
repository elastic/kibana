/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchQuery } from 'kibana/public';
import { useRequest } from './use_request';
import { epmRouteService } from '../../services';
import { GetCategoriesResponse, GetPackagesResponse } from '../../types';

export const useGetCategories = () => {
  return useRequest<GetCategoriesResponse>({
    path: epmRouteService.getCategoriesPath(),
    method: 'get',
  });
};

export const useGetPackages = (query: HttpFetchQuery = {}) => {
  return useRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query,
  });
};

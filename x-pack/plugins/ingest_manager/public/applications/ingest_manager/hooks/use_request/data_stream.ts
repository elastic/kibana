/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useRequest } from './use_request';
import { dataStreamRouteService } from '../../services';
import { GetDataStreamsResponse } from '../../types';

export const useGetDataStreams = () => {
  return useRequest<GetDataStreamsResponse>({
    path: dataStreamRouteService.getListPath(),
    method: 'get',
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpHandlerMockFactory,
  ResponseProvidersInterface,
} from '../../../common/mock/endpoint/http_handler_mock_factory';
import { HostIsolationResponse } from '../../../../common/endpoint/types';

export type HostIsolationHttpMocksInterface = ResponseProvidersInterface<{
  isolateHost: () => HostIsolationResponse;

  releaseHost: () => HostIsolationResponse;
}>;

export const hostIsolationHttpMocks = httpHandlerMockFactory<HostIsolationHttpMocksInterface>([
  {
    id: 'isolateHost',
    path: '/api/endpoint/isolate',
    method: 'post',
    handler: (): HostIsolationResponse => {
      return { action: '1-2-3' };
    },
  },
  {
    id: 'releaseHost',
    path: '/api/endpoint/unisolate',
    method: 'post',
    handler: (): HostIsolationResponse => {
      return { action: '3-2-1' };
    },
  },
]);

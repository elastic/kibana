/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fleetProxiesRoutesService } from '../../../common/services';
import { LATEST_PUBLIC_VERSION } from '../../../common/constants';

import type {
  GetFleetProxiesResponse,
  PostFleetProxiesRequest,
  PutFleetProxiesRequest,
} from '../../../common/types/rest_spec/fleet_proxies';

import { sendRequest, useRequest } from './use_request';

export function useGetFleetProxies() {
  return useRequest<GetFleetProxiesResponse>({
    method: 'get',
    path: fleetProxiesRoutesService.getListPath(),
    version: LATEST_PUBLIC_VERSION,
  });
}

export function sendDeleteFleetProxy(proxyId: string) {
  return sendRequest({
    method: 'delete',
    path: fleetProxiesRoutesService.getDeletePath(proxyId),
    version: LATEST_PUBLIC_VERSION,
  });
}

export function sendPostFleetProxy(body: PostFleetProxiesRequest['body']) {
  return sendRequest({
    method: 'post',
    path: fleetProxiesRoutesService.getCreatePath(),
    body,
    version: LATEST_PUBLIC_VERSION,
  });
}

export function sendPutFleetProxy(proxyId: string, body: PutFleetProxiesRequest['body']) {
  return sendRequest({
    method: 'put',
    path: fleetProxiesRoutesService.getUpdatePath(proxyId),
    version: LATEST_PUBLIC_VERSION,
    body,
  });
}

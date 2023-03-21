/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fleetServerHostsRoutesService } from '../../../common/services';
import type {
  GetFleetServerHostsResponse,
  PostFleetServerHostsRequest,
  PutFleetServerHostsRequest,
  PostFleetServerHostsResponse,
} from '../../../common/types/rest_spec/fleet_server_hosts';

import { sendRequest, useRequest } from './use_request';

export function useGetFleetServerHosts() {
  return useRequest<GetFleetServerHostsResponse>({
    method: 'get',
    path: fleetServerHostsRoutesService.getListPath(),
  });
}

export function sendDeleteFleetServerHost(itemId: string) {
  return sendRequest({
    method: 'delete',
    path: fleetServerHostsRoutesService.getDeletePath(itemId),
  });
}

export function sendPutFleetServerHost(itemId: string, body: PutFleetServerHostsRequest['body']) {
  return sendRequest({
    method: 'put',
    path: fleetServerHostsRoutesService.getUpdatePath(itemId),
    body,
  });
}

export function sendPostFleetServerHost(body: PostFleetServerHostsRequest['body']) {
  return sendRequest<PostFleetServerHostsResponse>({
    method: 'post',
    path: fleetServerHostsRoutesService.getCreatePath(),
    body,
  });
}

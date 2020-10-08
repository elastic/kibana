/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sendRequest, useRequest } from './use_request';
import { outputRoutesService } from '../../services';
import { PutOutputRequest, GetOutputsResponse } from '../../types';

export function useGetOutputs() {
  return useRequest<GetOutputsResponse>({
    method: 'get',
    path: outputRoutesService.getListPath(),
  });
}

export function sendPutOutput(outputId: string, body: PutOutputRequest['body']) {
  return sendRequest({
    method: 'put',
    path: outputRoutesService.getUpdatePath(outputId),
    body,
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';

import { outputRoutesService } from '../../services';
import type { PutOutputRequest, GetOutputsResponse } from '../../types';

import { sendRequest, useRequest } from './use_request';

export function useGetOutputs() {
  return useRequest<GetOutputsResponse>({
    method: 'get',
    path: outputRoutesService.getListPath(),
  });
}

export function useDefaultOutput() {
  const outputsRequest = useGetOutputs();
  const output = useMemo(() => {
    return outputsRequest.data?.items.find((o) => o.is_default);
  }, [outputsRequest.data]);

  const refresh = useCallback(() => {
    return outputsRequest.resendRequest();
  }, [outputsRequest]);

  return useMemo(() => {
    return { output, refresh };
  }, [output, refresh]);
}

export function sendPutOutput(outputId: string, body: PutOutputRequest['body']) {
  return sendRequest({
    method: 'put',
    path: outputRoutesService.getUpdatePath(outputId),
    body,
  });
}

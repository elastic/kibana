/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { downloadSourceRoutesService } from '../../services';
import type {
  GetDownloadSourceResponse,
  PostDownloadSourceRequest,
  PutDownloadSourceRequest,
} from '../../types';

import { OLDEST_PUBLIC_VERSION } from '../../../common/constants';

import { useRequest, sendRequest } from './use_request';

export function useGetDownloadSources() {
  return useRequest<GetDownloadSourceResponse>({
    method: 'get',
    path: downloadSourceRoutesService.getListPath(),
    version: OLDEST_PUBLIC_VERSION,
  });
}

export function useDefaultDownloadSource() {
  const downloadSourcesRequest = useGetDownloadSources();
  const downloadSource = downloadSourcesRequest.data?.items.find((o) => o.is_default);

  return { downloadSource, refresh: downloadSourcesRequest.resendRequest };
}

export function sendPutDownloadSource(
  downloadSourceId: string,
  body: PutDownloadSourceRequest['body']
) {
  return sendRequest({
    method: 'put',
    path: downloadSourceRoutesService.getUpdatePath(downloadSourceId),
    version: OLDEST_PUBLIC_VERSION,
    body,
  });
}

export function sendPostDownloadSource(body: PostDownloadSourceRequest['body']) {
  return sendRequest({
    method: 'post',
    path: downloadSourceRoutesService.getCreatePath(),
    version: OLDEST_PUBLIC_VERSION,
    body,
  });
}

export function sendDeleteDownloadSource(downloadSourceId: string) {
  return sendRequest({
    method: 'delete',
    path: downloadSourceRoutesService.getDeletePath(downloadSourceId),
    version: OLDEST_PUBLIC_VERSION,
  });
}

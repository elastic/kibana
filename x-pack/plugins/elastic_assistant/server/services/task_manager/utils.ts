/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeRawRequest, Headers, type IBasePath, KibanaRequest } from '@kbn/core-http-server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';

export function getFakeKibanaRequest(
  basePathService: IBasePath,
  spaceId: string,
  apiKey: string
): KibanaRequest {
  const requestHeaders: Headers = {};

  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const path = addSpaceIdToPath('/', spaceId);

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  const fakeRequest = CoreKibanaRequest.from(fakeRawRequest);
  basePathService.set(fakeRequest, path);

  return fakeRequest;
}

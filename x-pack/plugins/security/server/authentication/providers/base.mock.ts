/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  loggingServiceMock,
  httpServiceMock,
  elasticsearchServiceMock,
} from '../../../../../../src/core/server/mocks';

export type MockAuthenticationProviderOptions = ReturnType<
  typeof mockAuthenticationProviderOptions
>;

export function mockAuthenticationProviderOptions() {
  const basePath = httpServiceMock.createSetupContract().basePath;
  basePath.get.mockReturnValue('/base-path');

  return {
    client: elasticsearchServiceMock.createClusterClient(),
    logger: loggingServiceMock.create().get(),
    basePath,
    tokens: { refresh: jest.fn(), invalidate: jest.fn() },
  };
}

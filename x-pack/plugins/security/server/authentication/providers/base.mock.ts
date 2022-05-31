/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

export type MockAuthenticationProviderOptions = ReturnType<
  typeof mockAuthenticationProviderOptions
>;

export function mockAuthenticationProviderOptions(options?: { name: string }) {
  return {
    getServerBaseURL: () => 'test-protocol://test-hostname:1234',
    client: elasticsearchServiceMock.createClusterClient(),
    logger: loggingSystemMock.create().get(),
    basePath: httpServiceMock.createBasePath(),
    getRequestOriginalURL: jest.fn(),
    tokens: { refresh: jest.fn(), invalidate: jest.fn() },
    name: options?.name ?? 'basic1',
    urls: {
      loggedOut: jest.fn().mockReturnValue('/mock-server-basepath/security/logged_out'),
    },
  };
}

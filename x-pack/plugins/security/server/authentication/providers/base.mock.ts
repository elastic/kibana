/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ScopedClusterClient } from '../../../../../../src/core/server';
import { Tokens } from '../tokens';
import {
  loggingServiceMock,
  httpServiceMock,
  elasticsearchServiceMock,
} from '../../../../../../src/core/server/mocks';

export type MockAuthenticationProviderOptions = ReturnType<
  typeof mockAuthenticationProviderOptions
>;

export type MockAuthenticationProviderOptionsWithJest = ReturnType<
  typeof mockAuthenticationProviderOptionsWithJest
>;

export function mockScopedClusterClient(
  client: MockAuthenticationProviderOptions['client'],
  requestMatcher: sinon.SinonMatcher = sinon.match.any
) {
  const scopedClusterClient = sinon.createStubInstance(ScopedClusterClient);
  client.asScoped.withArgs(requestMatcher).returns(scopedClusterClient);
  return scopedClusterClient;
}

export function mockAuthenticationProviderOptions() {
  const logger = loggingServiceMock.create().get();
  const basePath = httpServiceMock.createSetupContract().basePath;
  basePath.get.mockReturnValue('/base-path');

  return {
    getServerBaseURL: () => 'test-protocol://test-hostname:1234',
    client: { callAsInternalUser: sinon.stub(), asScoped: sinon.stub(), close: sinon.stub() },
    logger,
    basePath,
    tokens: sinon.createStubInstance(Tokens),
  };
}

// Will be renamed to mockAuthenticationProviderOptions as soon as we migrate all providers tests to Jest.
export function mockAuthenticationProviderOptionsWithJest() {
  const basePath = httpServiceMock.createSetupContract().basePath;
  basePath.get.mockReturnValue('/base-path');

  return {
    getServerBaseURL: () => 'test-protocol://test-hostname:1234',
    client: elasticsearchServiceMock.createClusterClient(),
    logger: loggingServiceMock.create().get(),
    basePath,
    tokens: { refresh: jest.fn(), invalidate: jest.fn() },
  };
}

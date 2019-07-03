/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ScopedClusterClient } from '../../../../../../src/core/server';
import { Tokens } from '../tokens';
import { loggingServiceMock, httpServiceMock } from '../../../../../../src/core/server/mocks';

export type MockAuthenticationProviderOptions = ReturnType<
  typeof mockAuthenticationProviderOptions
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
    client: { callAsInternalUser: sinon.stub(), asScoped: sinon.stub(), close: sinon.stub() },
    logger,
    basePath,
    tokens: sinon.createStubInstance(Tokens),
  };
}

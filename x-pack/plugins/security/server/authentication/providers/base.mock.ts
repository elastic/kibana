/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { Tokens } from '../tokens';
import { loggingServiceMock, httpServiceMock } from '../../../../../../src/core/server/mocks';

export type MockAuthenticationProviderOptions = ReturnType<
  typeof mockAuthenticationProviderOptions
>;

export function mockAuthenticationProviderOptions() {
  const logger = loggingServiceMock.create().get();
  const basePath = httpServiceMock.createSetupContract().basePath;
  basePath.get.mockReturnValue('/base-path');

  return {
    client: {
      callWithInternalUser: sinon.stub(),
      callWithRequest: sinon.stub(),
      close: sinon.stub(),
    },
    logger,
    basePath,
    tokens: sinon.createStubInstance(Tokens),
  };
}

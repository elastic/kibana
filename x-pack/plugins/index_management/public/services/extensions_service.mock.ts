/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExtensionsService, ExtensionsSetup } from './extensions_service';

export type ExtensionsSetupMock = jest.Mocked<ExtensionsSetup>;

const createServiceMock = (): ExtensionsSetupMock => ({
  addAction: jest.fn(),
  addBadge: jest.fn(),
  addBanner: jest.fn(),
  addFilter: jest.fn(),
  addSummary: jest.fn(),
  addToggle: jest.fn(),
});

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<ExtensionsService>> = {
    setup: jest.fn(),
  };
  mocked.setup.mockReturnValue(createServiceMock());
  return mocked;
};

export const extensionsServiceMock = {
  create: createMock,
  createSetupContract: createServiceMock,
};

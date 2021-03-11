/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extensionsServiceMock } from './services/extensions_service.mock';

export { extensionsServiceMock } from './services/extensions_service.mock';

function createIdxManagementSetupMock() {
  const mock = {
    extensionsService: extensionsServiceMock,
  };

  return mock;
}

export const indexManagementMock = {
  createSetup: createIdxManagementSetupMock,
};

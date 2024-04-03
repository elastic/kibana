/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extensionsServiceMock } from '@kbn/index-management/src/services/extensions_service.mock';
import { publicApiServiceMock } from './services/public_api_service.mock';

export { extensionsServiceMock } from '@kbn/index-management/src/services/extensions_service.mock';
export { publicApiServiceMock } from './services/public_api_service.mock';

function createIdxManagementSetupMock() {
  const mock = {
    extensionsService: extensionsServiceMock,
    publicApiService: publicApiServiceMock,
  };

  return mock;
}

export const indexManagementMock = {
  createSetup: createIdxManagementSetupMock,
};

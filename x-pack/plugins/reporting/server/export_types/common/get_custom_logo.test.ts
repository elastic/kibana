/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { getCustomLogo } from './get_custom_logo';

test(`gets logo from uiSettings`, async () => {
  const headers = {
    foo: 'bar',
    baz: 'quix',
  };

  const mockGet = jest.fn();
  mockGet.mockImplementationOnce((...args: string[]) => {
    if (args[0] === 'xpackReporting:customPdfLogo') {
      return 'purple pony';
    }
    throw new Error('wrong caller args!');
  });
  const mockRequest = httpServerMock.createKibanaRequest();

  // create mock uiSettingsClient
  const coreStart = coreMock.createStart();
  const soClient = coreStart.savedObjects.getScopedClient(mockRequest);
  const uiSettingsClient = coreMock.createStart().uiSettings.asScopedToClient(soClient);
  const { logo } = await getCustomLogo(uiSettingsClient, headers);
  expect(logo).toBeDefined();
});

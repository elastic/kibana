/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, coreMock } from '@kbn/core/server/mocks';
import { getContextFactory } from './context';

describe('getContextFactory', () => {
  it('returns a GlobalSearchProviderContext bound to the request', () => {
    const coreStart = coreMock.createStart();
    const request = httpServerMock.createKibanaRequest();

    const factory = getContextFactory(coreStart);
    const context = factory(request);

    expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledTimes(1);
    expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request);

    expect(coreStart.savedObjects.getTypeRegistry).toHaveBeenCalledTimes(1);

    const soClient = coreStart.savedObjects.getScopedClient.mock.results[0].value;
    expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalledTimes(1);
    expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalledWith(soClient);

    expect(coreStart.capabilities.resolveCapabilities).toHaveBeenCalledTimes(1);
    expect(coreStart.capabilities.resolveCapabilities).toHaveBeenCalledWith(request);

    expect(context).toEqual({
      core: {
        savedObjects: expect.any(Object),
        uiSettings: expect.any(Object),
        capabilities: expect.any(Object),
      },
    });
  });
});

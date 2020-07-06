/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock, coreMock } from '../../../../../src/core/server/mocks';
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

    expect(coreStart.elasticsearch.legacy.client.asScoped).toHaveBeenCalledTimes(1);
    expect(coreStart.elasticsearch.legacy.client.asScoped).toHaveBeenCalledWith(request);

    const soClient = coreStart.savedObjects.getScopedClient.mock.results[0].value;
    expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalledTimes(1);
    expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalledWith(soClient);

    expect(context).toEqual({
      core: {
        savedObjects: expect.any(Object),
        elasticsearch: expect.any(Object),
        uiSettings: expect.any(Object),
      },
    });
  });
});

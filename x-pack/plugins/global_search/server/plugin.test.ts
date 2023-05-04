/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerRoutesMock } from './plugin.test.mocks';

import { coreMock } from '@kbn/core/server/mocks';
import { GlobalSearchPlugin } from './plugin';

describe('GlobalSearchPlugin', () => {
  let plugin: GlobalSearchPlugin;

  beforeEach(() => {
    plugin = new GlobalSearchPlugin(coreMock.createPluginInitializerContext());
  });

  it('registers routes during `setup`', async () => {
    await plugin.setup(coreMock.createSetup());
    expect(registerRoutesMock).toHaveBeenCalledTimes(1);
  });

  it('registers the globalSearch route handler context', async () => {
    const coreSetup = coreMock.createSetup();
    await plugin.setup(coreSetup);
    expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
    expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledWith(
      'globalSearch',
      expect.any(Function)
    );
  });
});

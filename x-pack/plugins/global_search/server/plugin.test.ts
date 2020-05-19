/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerRoutesMock } from './plugin.test.mocks';

import { coreMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { GlobalSearchPlugin } from './plugin';

describe('GlobalSearchPlugin', () => {
  let licensing: ReturnType<typeof licensingMock.createSetup>;
  let plugin: GlobalSearchPlugin;

  beforeEach(() => {
    licensing = licensingMock.createSetup();
    plugin = new GlobalSearchPlugin(coreMock.createPluginInitializerContext());
  });

  it('registers routes during `setup`', async () => {
    await plugin.setup(coreMock.createSetup(), { licensing });
    expect(registerRoutesMock).toHaveBeenCalledTimes(1);
  });

  it('registers the globalSearch route handler context', async () => {
    const coreSetup = coreMock.createSetup();
    await plugin.setup(coreSetup, { licensing });
    expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
    expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledWith(
      'globalSearch',
      expect.any(Function)
    );
  });
});

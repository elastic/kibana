/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../src/core/server/mocks';
import { globalSearchPluginMock } from '../../global_search/server/mocks';
import { GlobalSearchProvidersPlugin } from './plugin';

describe('GlobalSearchProvidersPlugin', () => {
  let plugin: GlobalSearchProvidersPlugin;
  let globalSearchSetup: ReturnType<typeof globalSearchPluginMock.createSetupContract>;

  beforeEach(() => {
    plugin = new GlobalSearchProvidersPlugin();
    globalSearchSetup = globalSearchPluginMock.createSetupContract();
  });

  describe('#setup', () => {
    it('registers the `savedObjects` result provider', () => {
      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup, { globalSearch: globalSearchSetup });

      expect(globalSearchSetup.registerResultProvider).toHaveBeenCalledTimes(1);
      expect(globalSearchSetup.registerResultProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'savedObjects',
        })
      );
    });
  });
});

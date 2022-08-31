/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { StackConnectorsPlugin } from './plugin';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

describe('Stack Connectors Plugin', () => {
  describe('setup()', () => {
    let context: PluginInitializerContext;
    let plugin: StackConnectorsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext();
      plugin = new StackConnectorsPlugin(context);
      coreSetup = coreMock.createSetup();
    });

    it('should register built in connector types', () => {
      const actionsSetup = actionsMock.createSetup();
      plugin.setup(coreSetup, { actions: actionsSetup });
      expect(actionsSetup.registerType).toHaveBeenCalledTimes(10);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterDeprecationsConfig, GetDeprecationsContext } from 'src/core/server';
import { coreMock } from '../../../../src/core/server/mocks';

import { CodePlugin } from './plugin';

describe('Code Plugin', () => {
  let deprecationConfigs: RegisterDeprecationsConfig[];

  beforeEach(() => {
    deprecationConfigs = [];
  });

  const getDeprecationContextMock = () => ({} as GetDeprecationsContext);

  describe('setup()', () => {
    it('does not log deprecation message if no xpack.code.* configurations are set', async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new CodePlugin(context);

      const coreSetup = coreMock.createSetup();
      coreSetup.deprecations.registerDeprecations.mockImplementation((deprecationConfig) => {
        deprecationConfigs.push(deprecationConfig);
      });

      await plugin.setup(coreSetup);

      expect(coreSetup.deprecations.registerDeprecations).toHaveBeenCalledTimes(1);
      expect(deprecationConfigs).toHaveLength(1);

      const deprecations = await deprecationConfigs[0].getDeprecations(getDeprecationContextMock());
      expect(deprecations).toHaveLength(0);
    });

    it('logs deprecation message if any xpack.code.* configurations are set', async () => {
      const context = coreMock.createPluginInitializerContext({
        foo: 'bar',
      });
      const warn = jest.fn();
      context.logger.get = jest.fn().mockReturnValue({ warn });
      const plugin = new CodePlugin(context);

      const coreSetup = coreMock.createSetup();
      coreSetup.deprecations.registerDeprecations.mockImplementation((deprecationConfig) => {
        deprecationConfigs.push(deprecationConfig);
      });

      await plugin.setup(coreSetup);

      expect(coreSetup.deprecations.registerDeprecations).toHaveBeenCalledTimes(1);
      expect(deprecationConfigs).toHaveLength(1);

      const deprecations = await deprecationConfigs[0].getDeprecations(getDeprecationContextMock());
      expect(deprecations).toHaveLength(1);
      expect(deprecations[0]).toEqual({
        level: 'critical',
        deprecationType: 'feature',
        title: expect.any(String),
        message: expect.any(String),
        requireRestart: true,
        correctiveActions: expect.objectContaining({
          manualSteps: expect.any(Array),
        }),
      });
    });
  });
});

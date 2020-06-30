/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingBuiltinsPlugin } from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';
import { alertsMock } from '../../alerts/server/mocks';

describe('AlertingBuiltins Plugin', () => {
  describe('setup()', () => {
    let context: ReturnType<typeof coreMock['createPluginInitializerContext']>;
    let plugin: AlertingBuiltinsPlugin;
    let coreSetup: ReturnType<typeof coreMock['createSetup']>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext();
      plugin = new AlertingBuiltinsPlugin(context);
      coreSetup = coreMock.createSetup();
    });

    it('should register built-in alert types', async () => {
      const alertingSetup = alertsMock.createSetup();
      await plugin.setup(coreSetup, { alerts: alertingSetup });

      expect(alertingSetup.registerType).toHaveBeenCalledTimes(1);

      const args = alertingSetup.registerType.mock.calls[0][0];
      const testedArgs = { id: args.id, name: args.name, actionGroups: args.actionGroups };
      expect(testedArgs).toMatchInlineSnapshot(`
        Object {
          "actionGroups": Array [
            Object {
              "id": "threshold met",
              "name": "Threshold Met",
            },
          ],
          "id": ".index-threshold",
          "name": "Index threshold",
        }
      `);
    });

    it('should return a service in the expected shape', async () => {
      const alertingSetup = alertsMock.createSetup();
      const service = await plugin.setup(coreSetup, { alerts: alertingSetup });

      expect(typeof service.indexThreshold.timeSeriesQuery).toBe('function');
    });
  });

  describe('start()', () => {
    let context: ReturnType<typeof coreMock['createPluginInitializerContext']>;
    let plugin: AlertingBuiltinsPlugin;
    let coreStart: ReturnType<typeof coreMock['createStart']>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext();
      plugin = new AlertingBuiltinsPlugin(context);
      coreStart = coreMock.createStart();
    });

    it('should return a service in the expected shape', async () => {
      const service = await plugin.start(coreStart);

      expect(typeof service.indexThreshold.timeSeriesQuery).toBe('function');
    });
  });
});

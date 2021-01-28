/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingBuiltinsPlugin } from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';
import { alertsMock } from '../../alerts/server/mocks';
import { featuresPluginMock } from '../../features/server/mocks';
import { BUILT_IN_ALERTS_FEATURE } from './feature';

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
      const featuresSetup = featuresPluginMock.createSetup();
      await plugin.setup(coreSetup, { alerts: alertingSetup, features: featuresSetup });

      expect(alertingSetup.registerType).toHaveBeenCalledTimes(2);

      const indexThresholdArgs = alertingSetup.registerType.mock.calls[0][0];
      const testedIndexThresholdArgs = {
        id: indexThresholdArgs.id,
        name: indexThresholdArgs.name,
        actionGroups: indexThresholdArgs.actionGroups,
      };
      expect(testedIndexThresholdArgs).toMatchInlineSnapshot(`
        Object {
          "actionGroups": Array [
            Object {
              "id": "threshold met",
              "name": "Threshold met",
            },
          ],
          "id": ".index-threshold",
          "name": "Index threshold",
        }
      `);

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith(BUILT_IN_ALERTS_FEATURE);
    });
  });
});

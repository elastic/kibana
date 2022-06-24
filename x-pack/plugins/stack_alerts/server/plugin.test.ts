/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingBuiltinsPlugin } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
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
      coreSetup.getStartServices = jest.fn().mockResolvedValue([
        {
          application: {},
        },
        { triggersActionsUi: {} },
      ]);
    });

    it('should register built-in alert types', () => {
      const alertingSetup = alertsMock.createSetup();
      const featuresSetup = featuresPluginMock.createSetup();
      plugin.setup(coreSetup, { alerting: alertingSetup, features: featuresSetup });

      expect(alertingSetup.registerType).toHaveBeenCalledTimes(3);

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

      const geoThresholdArgs = alertingSetup.registerType.mock.calls[1][0];
      const testedGeoThresholdArgs = {
        id: geoThresholdArgs.id,
        name: geoThresholdArgs.name,
        actionGroups: geoThresholdArgs.actionGroups,
      };
      expect(testedGeoThresholdArgs).toMatchInlineSnapshot(`
        Object {
          "actionGroups": Array [
            Object {
              "id": "Tracked entity contained",
              "name": "Tracking containment met",
            },
          ],
          "id": ".geo-containment",
          "name": "Tracking containment",
        }
      `);

      const esQueryArgs = alertingSetup.registerType.mock.calls[2][0];
      const testedEsQueryArgs = {
        id: esQueryArgs.id,
        name: esQueryArgs.name,
        actionGroups: esQueryArgs.actionGroups,
      };
      expect(testedEsQueryArgs).toMatchInlineSnapshot(`
        Object {
          "actionGroups": Array [
            Object {
              "id": "query matched",
              "name": "Query matched",
            },
          ],
          "id": ".es-query",
          "name": "Elasticsearch query",
        }
      `);

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith(BUILT_IN_ALERTS_FEATURE);
    });
  });
});

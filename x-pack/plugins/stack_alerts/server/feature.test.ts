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

describe('Stack Alerts Feature Privileges', () => {
  test('feature privilege should contain all built-in rule types', () => {
    const context = coreMock.createPluginInitializerContext();
    const plugin = new AlertingBuiltinsPlugin(context);
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices = jest.fn().mockResolvedValue([
      {
        application: {},
      },
      { triggersActionsUi: {} },
    ]);

    const alertingSetup = alertsMock.createSetup();
    const featuresSetup = featuresPluginMock.createSetup();
    plugin.setup(coreSetup, { alerting: alertingSetup, features: featuresSetup });

    expect(BUILT_IN_ALERTS_FEATURE.alerting).toMatchInlineSnapshot(`
      Array [
        ".index-threshold",
        ".geo-containment",
        ".es-query",
        "transform_health",
        "observability.rules.custom_threshold",
        "xpack.ml.anomaly_detection_alert",
      ]
    `);

    expect(BUILT_IN_ALERTS_FEATURE.privileges?.all?.alerting?.rule?.all).toMatchInlineSnapshot(`
      Array [
        ".index-threshold",
        ".geo-containment",
        ".es-query",
        "transform_health",
        "observability.rules.custom_threshold",
        "xpack.ml.anomaly_detection_alert",
      ]
    `);

    expect(BUILT_IN_ALERTS_FEATURE.privileges?.read?.alerting?.rule?.read).toMatchInlineSnapshot(`
      Array [
        ".index-threshold",
        ".geo-containment",
        ".es-query",
        "transform_health",
        "observability.rules.custom_threshold",
        "xpack.ml.anomaly_detection_alert",
      ]
    `);
  });
});

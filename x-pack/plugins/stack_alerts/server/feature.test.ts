/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingBuiltinsPlugin } from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';
import { alertsMock } from '../../alerting/server/mocks';
import { featuresPluginMock } from '../../features/server/mocks';
import { BUILT_IN_ALERTS_FEATURE } from './feature';

describe('Stack Alerts Feature Privileges', () => {
  test('feature privilege should contain all built-in rule types', async () => {
    const context = coreMock.createPluginInitializerContext();
    const plugin = new AlertingBuiltinsPlugin(context);
    const coreSetup = coreMock.createSetup();
    const alertingSetup = alertsMock.createSetup();
    const featuresSetup = featuresPluginMock.createSetup();
    await plugin.setup(coreSetup, { alerting: alertingSetup, features: featuresSetup });

    const typesInFeaturePrivilege = BUILT_IN_ALERTS_FEATURE.alerting;
    const typesInFeaturePrivilegeAll = BUILT_IN_ALERTS_FEATURE.privileges.all.alerting.all;
    const typesInFeaturePrivilegeRead = BUILT_IN_ALERTS_FEATURE.privileges.read.alerting.read;
    expect(alertingSetup.registerType.mock.calls.length).toEqual(typesInFeaturePrivilege.length);
    expect(alertingSetup.registerType.mock.calls.length).toEqual(typesInFeaturePrivilegeAll.length);
    expect(alertingSetup.registerType.mock.calls.length).toEqual(
      typesInFeaturePrivilegeRead.length
    );

    alertingSetup.registerType.mock.calls.forEach((call) => {
      expect(typesInFeaturePrivilege.indexOf(call[0].id)).toBeGreaterThanOrEqual(0);
      expect(typesInFeaturePrivilegeAll.indexOf(call[0].id)).toBeGreaterThanOrEqual(0);
      expect(typesInFeaturePrivilegeRead.indexOf(call[0].id)).toBeGreaterThanOrEqual(0);
    });
  });
});

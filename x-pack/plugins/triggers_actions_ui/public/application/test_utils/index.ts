/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { featuresPluginMock } from '../../../../features/public/mocks';
import { chartPluginMock } from '../../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { alertingPluginMock } from '../../../../alerts/public/mocks';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { alertTypeRegistryMock } from '../alert_type_registry.mock';
import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';

export async function getMockedAppDependencies() {
  const coreSetupMock = coreMock.createSetup();
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const alertTypeRegistry = alertTypeRegistryMock.create();
  const [
    {
      chrome,
      docLinks,
      application: { capabilities, navigateToApp },
    },
  ] = await coreSetupMock.getStartServices();
  const kibanaFeatures = await featuresPluginMock.createStart().getFeatures();

  return {
    data: dataPluginMock.createStartContract(),
    charts: chartPluginMock.createStartContract(),
    chrome,
    navigateToApp,
    docLinks,
    toastNotifications: coreSetupMock.notifications.toasts,
    http: coreSetupMock.http,
    uiSettings: coreSetupMock.uiSettings,
    setBreadcrumbs: jest.fn(),
    capabilities,
    actionTypeRegistry,
    alertTypeRegistry,
    history: scopedHistoryMock.create(),
    alerting: alertingPluginMock.createStartContract(),
    kibanaFeatures,
  };
}

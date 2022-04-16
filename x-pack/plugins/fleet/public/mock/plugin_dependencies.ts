/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { homePluginMock } from '@kbn/home-plugin/public/mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { customIntegrationsMock } from '@kbn/custom-integrations-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

export const createSetupDepsMock = () => {
  const cloud = cloudMock.createSetup();
  return {
    data: dataPluginMock.createSetupContract(),
    home: homePluginMock.createSetupContract(),
    customIntegrations: customIntegrationsMock.createSetup(),
    cloud,
  };
};

export const createStartDepsMock = () => {
  return {
    licensing: licensingMock.createStart(),
    data: dataPluginMock.createStartContract(),
    navigation: navigationPluginMock.createStartContract(),
    customIntegrations: customIntegrationsMock.createStart(),
    share: sharePluginMock.createStartContract(),
    cloud: cloudMock.createStart(),
  };
};

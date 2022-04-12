/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { unifiedSearchPluginMock } from '../../../../../src/plugins/unified_search/public/mocks';
import { licensingMock } from '../../../licensing/public/mocks';
import { cloudMock } from '../../../cloud/public/mocks';
import { homePluginMock } from '../../../../../src/plugins/home/public/mocks';
import { navigationPluginMock } from '../../../../../src/plugins/navigation/public/mocks';
import { customIntegrationsMock } from '../../../../../src/plugins/custom_integrations/public/mocks';
import { sharePluginMock } from '../../../../../src/plugins/share/public/mocks';

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
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    navigation: navigationPluginMock.createStartContract(),
    customIntegrations: customIntegrationsMock.createStart(),
    share: sharePluginMock.createStartContract(),
    cloud: cloudMock.createStart(),
  };
};

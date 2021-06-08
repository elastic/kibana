/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { licensingMock } from '../../../licensing/public/mocks';
import { homePluginMock } from '../../../../../src/plugins/home/public/mocks';

import type { MockedFleetSetupDeps, MockedFleetStartDeps } from './types';

export const createSetupDepsMock = (): MockedFleetSetupDeps => {
  return {
    licensing: licensingMock.createSetup(),
    data: dataPluginMock.createSetupContract(),
    home: homePluginMock.createSetupContract(),
  };
};

export const createStartDepsMock = (): MockedFleetStartDeps => {
  return {
    data: dataPluginMock.createStartContract(),
  };
};

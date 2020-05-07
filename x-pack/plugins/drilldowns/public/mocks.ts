/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DrilldownsSetup, DrilldownsStart } from '.';

export type Setup = jest.Mocked<DrilldownsSetup>;
export type Start = jest.Mocked<DrilldownsStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    registerDrilldown: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    FlyoutManageDrilldowns: jest.fn(),
  };

  return startContract;
};

export const drilldownsPluginMock = {
  createSetupContract,
  createStartContract,
};

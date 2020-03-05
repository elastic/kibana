/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DrilldownsSetupContract, DrilldownsStartContract } from '.';

export type Setup = jest.Mocked<DrilldownsSetupContract>;
export type Start = jest.Mocked<DrilldownsStartContract>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    registerDrilldown: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {};

  return startContract;
};

export const bfetchPluginMock = {
  createSetupContract,
  createStartContract,
};

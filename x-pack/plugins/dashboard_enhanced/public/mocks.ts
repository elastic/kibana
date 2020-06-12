/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DashboardEnhancedSetupContract, DashboardEnhancedStartContract } from '.';

export type Setup = jest.Mocked<DashboardEnhancedSetupContract>;
export type Start = jest.Mocked<DashboardEnhancedStartContract>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {};

  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {};

  return startContract;
};

export const dashboardEnhancedPluginMock = {
  createSetupContract,
  createStartContract,
};

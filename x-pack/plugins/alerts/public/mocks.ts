/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingPublicPlugin } from './plugin';

export type Setup = jest.Mocked<ReturnType<AlertingPublicPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<AlertingPublicPlugin['start']>>;

const createSetupContract = (): Setup => ({
  registerNavigation: jest.fn(),
  registerDefaultNavigation: jest.fn(),
});

const createStartContract = (): Start => ({
  getNavigation: jest.fn(),
});

export const alertingPluginMock = {
  createSetupContract,
  createStartContract,
};

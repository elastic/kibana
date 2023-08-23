/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import type { AppClient, SecuritySolutionPluginRouter } from './types';

export type SecuritySolutionPluginRouterMock = jest.Mocked<SecuritySolutionPluginRouter> & {
  versioned: MockedVersionedRouter;
};

type AppClientMock = jest.Mocked<AppClient>;
const createAppClientMock = (): AppClientMock =>
  ({
    getAlertsIndex: jest.fn(),
    getSignalsIndex: jest.fn(),
    getSourcererDataViewId: jest.fn().mockReturnValue('security-solution'),
  } as unknown as AppClientMock);

export const siemMock = {
  createClient: createAppClientMock,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppClient } from './types';

type AppClientMock = jest.Mocked<AppClient>;
const createAppClientMock = (): AppClientMock =>
  ({
    getSignalsIndex: jest.fn(),
    getSourcererDataViewId: jest.fn().mockReturnValue('security-solution'),
  } as unknown as AppClientMock);

export const siemMock = {
  createClient: createAppClientMock,
};

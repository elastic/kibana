/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppClient } from './types';

type AppClientMock = jest.Mocked<AppClient>;
const createAppClientMock = (): AppClientMock =>
  (({
    getSignalsIndex: jest.fn(),
  } as unknown) as AppClientMock);

export const siemMock = {
  createClient: createAppClientMock,
};

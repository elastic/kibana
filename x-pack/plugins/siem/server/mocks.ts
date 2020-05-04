/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SiemClient } from './types';

type SiemClientMock = jest.Mocked<SiemClient>;
const createSiemClientMock = (): SiemClientMock =>
  (({
    getSignalsIndex: jest.fn(),
  } as unknown) as SiemClientMock);

export const siemMock = {
  createClient: createSiemClientMock,
};

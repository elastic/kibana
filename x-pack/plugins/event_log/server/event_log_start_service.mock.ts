/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEventLogClientService } from './types';

const createEventLogServiceMock = () => {
  const mock: jest.Mocked<IEventLogClientService> = {
    getClient: jest.fn(),
  };
  return mock;
};

export const eventLogStartServiceMock = {
  create: createEventLogServiceMock,
};

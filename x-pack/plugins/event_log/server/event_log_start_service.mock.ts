/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

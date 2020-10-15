/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEventLogClient } from './types';

const createEventLogClientMock = () => {
  const mock: jest.Mocked<IEventLogClient> = {
    findEventsBySavedObject: jest.fn(),
  };
  return mock;
};

export const eventLogClientMock = {
  create: createEventLogClientMock,
};

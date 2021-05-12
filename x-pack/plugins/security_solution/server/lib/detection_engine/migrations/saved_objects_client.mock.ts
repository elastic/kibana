/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalsMigrationSOClient } from './saved_objects_client';

const create = () =>
  ({
    bulkGet: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  } as jest.Mocked<SignalsMigrationSOClient>);

export const savedObjectClientMock = { create };

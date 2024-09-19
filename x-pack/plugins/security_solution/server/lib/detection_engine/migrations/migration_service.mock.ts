/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalsMigrationService } from './migration_service';

const create = () =>
  ({
    create: jest.fn(),
    delete: jest.fn(),
    finalize: jest.fn(),
  } as jest.Mocked<SignalsMigrationService>);

export const migrationServiceMock = { create };

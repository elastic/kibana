/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleMigrationClient } from '../rules/__mocks__/mocks';

const createClient = () => ({ rules: createRuleMigrationClient() });

export const mockSetup = jest.fn().mockResolvedValue(undefined);
export const mockCreateClient = jest.fn().mockReturnValue(createClient());
export const mockStop = jest.fn();

export const siemMigrationsServiceMock = {
  create: () =>
    jest.fn().mockImplementation(() => ({
      setup: mockSetup,
      createClient: mockCreateClient,
      stop: mockStop,
    })),
  createClient: () => createClient(),
};

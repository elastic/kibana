/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockIndexName = 'mocked_data_stream_name';
export const mockInstall = jest.fn().mockResolvedValue(undefined);
export const mockCreateClient = jest.fn().mockReturnValue({});

export const MockRuleMigrationsDataStream = jest.fn().mockImplementation(() => ({
  install: mockInstall,
  createClient: mockCreateClient,
}));

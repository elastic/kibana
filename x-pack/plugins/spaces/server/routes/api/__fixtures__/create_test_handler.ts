/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { Server } from 'hapi';
import { createSpaces } from './create_spaces';

export interface TestConfig {
  [configKey: string]: any;
}

export interface TestOptions {
  setupFn?: (server: any) => void;
  testConfig?: TestConfig;
  payload?: any;
}

export type TeardownFn = () => void;

export interface RequestRunnerResult {
  server: any;
  mockSavedObjectsClient: any;
  response: any;
}

export type RequestRunner = (
  method: string,
  path: string,
  options?: TestOptions
) => Promise<RequestRunnerResult>;

const baseConfig: TestConfig = {
  'server.basePath': '',
};

export function createTestHandler(initApiFn: (server: any) => void) {
  const teardowns: TeardownFn[] = [];

  const spaces = createSpaces();

  const request: RequestRunner = async (
    method: string,
    path: string,
    options: TestOptions = {}
  ) => {
    const {
      setupFn = () => {
        return;
      },
      testConfig = {},
      payload,
    } = options;

    const server = new Server();

    const config = {
      ...baseConfig,
      ...testConfig,
    };

    server.connection({ port: 0 });

    await setupFn(server);

    server.decorate(
      'server',
      'config',
      jest.fn(() => {
        return {
          get: (key: string) => config[key],
        };
      })
    );

    initApiFn(server);

    server.decorate('request', 'getBasePath', jest.fn());
    server.decorate('request', 'setBasePath', jest.fn());

    // Mock server.getSavedObjectsClient()
    const mockSavedObjectsClient = {
      get: jest.fn((type, id) => {
        return spaces.filter(s => s.id === id)[0];
      }),
      find: jest.fn(() => {
        return {
          total: spaces.length,
          saved_objects: spaces,
        };
      }),
      create: jest.fn(() => ({})),
      update: jest.fn(() => ({})),
      delete: jest.fn(),
      errors: {
        isNotFoundError: jest.fn(() => true),
      },
    };

    server.decorate('request', 'getSavedObjectsClient', () => mockSavedObjectsClient);

    teardowns.push(() => server.stop());

    return {
      server,
      mockSavedObjectsClient,
      response: await server.inject({
        method,
        url: path,
        payload,
      }),
    };
  };

  return {
    request,
    teardowns,
  };
}

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
  preCheckLicenseImpl?: (req: any, reply: any) => any;
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

export const defaultPreCheckLicenseImpl = (request: any, reply: any) => reply();

const baseConfig: TestConfig = {
  'server.basePath': '',
};

export function createTestHandler(initApiFn: (server: any, preCheckLicenseImpl: any) => void) {
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
      preCheckLicenseImpl = defaultPreCheckLicenseImpl,
    } = options;

    let pre = jest.fn();
    if (preCheckLicenseImpl) {
      pre = pre.mockImplementation(preCheckLicenseImpl);
    }

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

    initApiFn(server, pre);

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

    const testRun = async () => {
      const response = await server.inject({
        method,
        url: path,
        payload,
      });

      if (preCheckLicenseImpl) {
        expect(pre).toHaveBeenCalled();
      } else {
        expect(pre).not.toHaveBeenCalled();
      }

      return response;
    };

    return {
      server,
      mockSavedObjectsClient,
      response: await testRun(),
    };
  };

  return {
    request,
    teardowns,
  };
}

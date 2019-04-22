/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { Server } from 'hapi';
import { Legacy } from 'kibana';
import { HttpServiceSetup } from 'src/core/server';
import { SecurityPlugin } from '../../../../../security';
import { SpacesClient } from '../../../lib/spaces_client';
import { createSpaces } from './create_spaces';
import { PublicRouteDeps } from '../public';
import { SpacesService } from '../../../new_platform/spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { PrivateRouteDeps } from '../v1';

interface KibanaServer extends Legacy.Server {
  savedObjects: any;
}

export interface TestConfig {
  [configKey: string]: any;
}

export interface TestOptions {
  setupFn?: (server: any) => void;
  testConfig?: TestConfig;
  payload?: any;
  preCheckLicenseImpl?: (req: any, h: any) => any;
  expectSpacesClientCall?: boolean;
}

export type TeardownFn = () => void;

export interface RequestRunnerResult {
  server: any;
  mockSavedObjectsRepository: any;
  response: any;
}

export type RequestRunner = (
  method: string,
  path: string,
  options?: TestOptions
) => Promise<RequestRunnerResult>;

export const defaultPreCheckLicenseImpl = (request: any) => '';

const baseConfig: TestConfig = {
  'server.basePath': '',
  'xpack.spaces.maxSpaces': 1000,
};

export function createTestHandler(initApiFn: (deps: PublicRouteDeps & PrivateRouteDeps) => void) {
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
      expectSpacesClientCall = true,
    } = options;

    let pre = jest.fn();
    if (preCheckLicenseImpl) {
      pre = pre.mockImplementation(preCheckLicenseImpl);
    }

    const server = new Server() as KibanaServer;

    const config = {
      ...baseConfig,
      ...testConfig,
    };

    await setupFn(server);

    const mockConfig = {
      get: (key: string) => config[key],
    };

    server.decorate('server', 'config', jest.fn<any, any>(() => mockConfig));

    server.decorate('request', 'getBasePath', jest.fn());
    server.decorate('request', 'setBasePath', jest.fn());

    const mockSavedObjectsRepository = {
      get: jest.fn((type, id) => {
        const result = spaces.filter(s => s.id === id);
        if (!result.length) {
          throw new Error(`not found: [${type}:${id}]`);
        }
        return result[0];
      }),
      find: jest.fn(() => {
        return {
          total: spaces.length,
          saved_objects: spaces,
        };
      }),
      create: jest.fn((type, attributes, { id }) => {
        if (spaces.find(s => s.id === id)) {
          throw new Error('conflict');
        }
        return {};
      }),
      update: jest.fn((type, id) => {
        if (!spaces.find(s => s.id === id)) {
          throw new Error('not found: during update');
        }
        return {};
      }),
      delete: jest.fn((type: string, id: string) => {
        return {};
      }),
      deleteByNamespace: jest.fn(),
    };

    server.savedObjects = {
      SavedObjectsClient: {
        errors: {
          isNotFoundError: jest.fn((e: any) => e.message.startsWith('not found:')),
          isConflictError: jest.fn((e: any) => e.message.startsWith('conflict')),
        },
      },
    };

    server.plugins.elasticsearch = {
      createCluster: jest.fn(),
      waitUntilReady: jest.fn(),
      getCluster: jest.fn().mockReturnValue({
        callWithRequest: jest.fn(),
        callWithInternalUser: jest.fn(),
      }),
    };

    const log = {
      log: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    const service = new SpacesService(log, server.config());
    const spacesService = await service.setup({
      elasticsearch: server.plugins.elasticsearch,
      savedObjects: server.savedObjects,
      security: {} as SecurityPlugin,
      spacesAuditLogger: {} as SpacesAuditLogger,
    });

    spacesService.scopedClient = jest.fn((req: any) => {
      return new SpacesClient(
        null as any,
        () => null,
        null,
        mockSavedObjectsRepository,
        mockConfig,
        mockSavedObjectsRepository,
        req
      );
    });

    initApiFn({
      http: ({
        server,
      } as unknown) as HttpServiceSetup,
      routePreCheckLicenseFn: pre,
      savedObjects: server.savedObjects,
      spacesService,
      log,
      config: mockConfig,
    });

    teardowns.push(() => server.stop());

    const headers = {
      authorization: 'foo',
    };

    const testRun = async () => {
      const response = await server.inject({
        method,
        url: path,
        headers,
        payload,
      });

      if (preCheckLicenseImpl) {
        expect(pre).toHaveBeenCalled();
      } else {
        expect(pre).not.toHaveBeenCalled();
      }

      if (expectSpacesClientCall) {
        expect(spacesService.scopedClient).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          })
        );
      } else {
        expect(spacesService.scopedClient).not.toHaveBeenCalled();
      }

      return response;
    };

    return {
      server,
      headers,
      mockSavedObjectsRepository,
      response: await testRun(),
    };
  };

  return {
    request,
    teardowns,
  };
}

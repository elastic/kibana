/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { Server } from 'hapi';
import { RawKibanaPrivileges } from '../../../../../common/model';
import { initGetPrivilegesApi } from './get';

const createRawKibanaPrivileges: () => RawKibanaPrivileges = () => {
  return {
    features: {
      feature1: {
        all: ['action1'],
      },
      feature2: {
        all: ['action2'],
      },
    },
    space: {
      all: ['space*'],
      read: ['space:read'],
    },
    global: {
      all: ['*'],
      read: ['something:/read'],
    },
    reserved: {
      customApplication1: ['custom-action1'],
      customApplication2: ['custom-action2'],
    },
  };
};

const createMockServer = () => {
  const mockServer = new Server({ debug: false, port: 8080 });

  mockServer.plugins.security = {
    authorization: {
      privileges: {
        get: jest.fn().mockImplementation(() => {
          return createRawKibanaPrivileges();
        }),
      },
    },
  } as any;
  return mockServer;
};

interface TestOptions {
  preCheckLicenseImpl?: () => void;
  includeActions?: boolean;
  asserts: {
    statusCode: number;
    result: Record<string, any>;
  };
}

describe('GET privileges', () => {
  const getPrivilegesTest = (
    description: string,
    { preCheckLicenseImpl = () => null, includeActions, asserts }: TestOptions
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = jest.fn().mockImplementation(preCheckLicenseImpl);

      initGetPrivilegesApi(mockServer, pre);
      const headers = {
        authorization: 'foo',
      };

      const url = `/api/security/privileges${includeActions ? '?includeActions=true' : ''}`;

      const request = {
        method: 'GET',
        url,
        headers,
      };
      const { result, statusCode } = await mockServer.inject(request);

      expect(pre).toHaveBeenCalled();
      expect(statusCode).toBe(asserts.statusCode);
      expect(result).toEqual(asserts.result);
    });
  };

  describe('failure', () => {
    getPrivilegesTest(`returns result of routePreCheckLicense`, {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });
  });

  describe('success', () => {
    getPrivilegesTest(`returns registered application privileges with actions when requested`, {
      includeActions: true,
      asserts: {
        statusCode: 200,
        result: createRawKibanaPrivileges(),
      },
    });

    getPrivilegesTest(`returns registered application privileges without actions`, {
      includeActions: false,
      asserts: {
        statusCode: 200,
        result: {
          global: ['all', 'read'],
          space: ['all', 'read'],
          features: {
            feature1: ['all'],
            feature2: ['all'],
          },
          reserved: ['customApplication1', 'customApplication2'],
        },
      },
    });
  });
});

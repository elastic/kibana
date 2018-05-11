/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRequestHasPrivileges } from './has_privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';

jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn()
}));

let mockCallWithRequest;
beforeEach(() => {
  mockCallWithRequest = jest.fn();
  getClient.mockReturnValue({
    callWithRequest: mockCallWithRequest
  });
});

const defaultVersion = 'default-version';
const defaultApplication = 'default-application';

const createMockServer = ({ settings = {} } = {}) => {
  const mockServer = {
    config: jest.fn().mockReturnValue({
      get: jest.fn()
    })
  };

  const defaultSettings = {
    'pkg.version': defaultVersion,
    'xpack.security.rbac.application': defaultApplication
  };

  mockServer.config().get.mockImplementation(key => {
    return key in settings ? settings[key] : defaultSettings[key];
  });

  return mockServer;
};

const mockResponse = (hasAllRequested, privileges, application = defaultApplication) => {
  mockCallWithRequest.mockImplementationOnce(async () => ({
    has_all_requested: hasAllRequested,
    application: {
      [application]: {
        [DEFAULT_RESOURCE]: privileges
      }
    }
  }));
};


test(`calls shield.hasPrivileges with request`, async () => {
  const mockServer = createMockServer();
  mockResponse(true, {
    [`version:${defaultVersion}`]: true,
    foo: true,
  });

  const requestHasPrivileges = createRequestHasPrivileges(mockServer);
  const request = {};
  const hasPrivileges = requestHasPrivileges(request);
  await hasPrivileges(['foo']);

  expect(mockCallWithRequest).toHaveBeenCalledWith(request, expect.anything(), expect.anything());
});

test(`calls shield.hasPrivileges with clientParams`, async () => {
  const application = 'foo-application';
  const version = 'foo-version';
  const mockServer = createMockServer({
    settings: {
      'xpack.security.rbac.application': application,
      'pkg.version': version
    }
  });

  mockResponse(true, {
    [`version:${version}`]: true,
    foo: true,
  }, application);

  const requestHasPrivileges = createRequestHasPrivileges(mockServer);
  const hasPrivileges = requestHasPrivileges({});

  const privilege = 'foo';
  await hasPrivileges([privilege]);

  const clientParams = mockCallWithRequest.mock.calls[0][2];
  const applicationParam = clientParams.body.applications[0];
  expect(applicationParam).toHaveProperty('application', application);
  expect(applicationParam).toHaveProperty('resources', [DEFAULT_RESOURCE]);
  expect(applicationParam).toHaveProperty('privileges', [`version:${version}`, privilege]);
});

test(`returns false success when has_all_requested`, async () => {
  const mockServer = createMockServer();
  mockResponse(true, {
    [`version:${defaultVersion}`]: true,
    foo: true,
  });

  const requestHasPrivileges = createRequestHasPrivileges(mockServer);
  const hasPrivileges = requestHasPrivileges({});
  const result = await hasPrivileges(['foo']);
  expect(result.success).toBe(true);
});

test(`returns false success when has_all_requested is false`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [`version:${defaultVersion}`]: true,
    foo: false,
  });
  mockCallWithRequest.mockImplementationOnce(async () => ({
    has_all_requested: false,
    application: {
      [defaultApplication]: {
        [DEFAULT_RESOURCE]: {
          foo: false
        }
      }
    }
  }));

  const requestHasPrivileges = createRequestHasPrivileges(mockServer);
  const hasPrivileges = requestHasPrivileges({});
  const result = await hasPrivileges(['foo']);
  expect(result.success).toBe(false);
});

test(`returns missing privileges`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [`version:${defaultVersion}`]: true,
    foo: false,
  });

  const requestHasPrivileges = createRequestHasPrivileges(mockServer);
  const hasPrivileges = requestHasPrivileges({});
  const result = await hasPrivileges(['foo']);
  expect(result.missing).toEqual(['foo']);
});

test(`excludes granted privileges from missing privileges`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [`version:${defaultVersion}`]: true,
    foo: false,
    bar: true,
  });

  const requestHasPrivileges = createRequestHasPrivileges(mockServer);
  const hasPrivileges = requestHasPrivileges({});
  const result = await hasPrivileges(['foo']);
  expect(result.missing).toEqual(['foo']);
});

test(`throws error if missing version privilege`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [`version:${defaultVersion}`]: false,
    foo: true,
  });

  const requestHasPrivileges = createRequestHasPrivileges(mockServer);
  const hasPrivileges = requestHasPrivileges({});
  expect(hasPrivileges(['foo'])).rejects.toThrowErrorMatchingSnapshot();
});

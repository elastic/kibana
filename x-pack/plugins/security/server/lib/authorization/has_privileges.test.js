/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hasPrivilegesWithServer } from './has_privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';
import { getLoginPrivilege, getVersionPrivilege } from '../privileges';

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

const mockResponse = (hasAllRequested, privileges, application = defaultApplication, username = '') => {
  mockCallWithRequest.mockImplementationOnce(async () => ({
    username: username,
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
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: true,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = {};
  const hasPrivileges = hasPrivilegesWithRequest(request);
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
    [getVersionPrivilege(version)]: true,
    [getLoginPrivilege()]: true,
    foo: true,
  }, application);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});

  const privilege = 'foo';
  await hasPrivileges([privilege]);

  const clientParams = mockCallWithRequest.mock.calls[0][2];
  const applicationParam = clientParams.body.applications[0];
  expect(applicationParam).toHaveProperty('application', application);
  expect(applicationParam).toHaveProperty('resources', [DEFAULT_RESOURCE]);
  expect(applicationParam).toHaveProperty('privileges');
  expect(applicationParam.privileges).toContain(privilege);
});

test(`includes version privilege when checking privileges`, async () => {
  const mockServer = createMockServer();
  mockResponse(true, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: true,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = {};
  const hasPrivileges = hasPrivilegesWithRequest(request);
  await hasPrivileges(['foo']);

  const clientParams = mockCallWithRequest.mock.calls[0][2];
  const applicationParam = clientParams.body.applications[0];
  expect(applicationParam.privileges).toContain(getVersionPrivilege(defaultVersion));
});

test(`includes login privilege when checking privileges`, async () => {
  const mockServer = createMockServer();
  mockResponse(true, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: true,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = {};
  const hasPrivileges = hasPrivilegesWithRequest(request);
  await hasPrivileges(['foo']);

  const clientParams = mockCallWithRequest.mock.calls[0][2];
  const applicationParam = clientParams.body.applications[0];
  expect(applicationParam.privileges).toContain(getLoginPrivilege());
});

test(`returns success when has_all_requested`, async () => {
  const mockServer = createMockServer();
  mockResponse(true, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: true,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});
  const result = await hasPrivileges(['foo']);
  expect(result.success).toBe(true);
});

test(`returns user from response when has_all_requested`, async () => {
  const mockServer = createMockServer();
  const username = 'foo-username';
  mockResponse(true, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: true,
  }, defaultApplication, username);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});
  const result = await hasPrivileges(['foo']);
  expect(result.username).toBe(username);
});

test(`returns false success when has_all_requested is false`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: false,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});
  const result = await hasPrivileges(['foo']);
  expect(result.success).toBe(false);
});

test(`returns user from request when has_all_requested is false`, async () => {
  const username = 'foo-username';
  const mockServer = createMockServer();
  mockResponse(false, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: false,
  }, defaultApplication, username);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({ });
  const result = await hasPrivileges(['foo']);
  expect(result.username).toBe(username);
});

test(`returns missing privileges`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: false,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});
  const result = await hasPrivileges(['foo']);
  expect(result.missing).toEqual(['foo']);
});

test(`excludes granted privileges from missing privileges`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: false,
    bar: true,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});
  const result = await hasPrivileges(['foo']);
  expect(result.missing).toEqual(['foo']);
});

test(`throws error if missing version privilege and has login privilege`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [getVersionPrivilege(defaultVersion)]: false,
    [getLoginPrivilege()]: true,
    foo: true,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});
  await expect(hasPrivileges(['foo'])).rejects.toThrowErrorMatchingSnapshot();
});

test(`doesn't throw error if missing version privilege and missing login privilege`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [getVersionPrivilege(defaultVersion)]: true,
    [getLoginPrivilege()]: true,
    foo: true,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});
  await hasPrivileges(['foo']);
});

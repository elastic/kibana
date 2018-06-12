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

const defaultKibanaIndex = 'default-kibana-index';
const defaultVersion = 'default-version';
const defaultApplication = 'default-application';

const createMockServer = ({ settings = {} } = {}) => {
  const mockServer = {
    config: jest.fn().mockReturnValue({
      get: jest.fn()
    })
  };

  const defaultSettings = {
    'kibana.index': defaultKibanaIndex,
    'pkg.version': defaultVersion,
    'xpack.security.rbac.application': defaultApplication
  };

  mockServer.config().get.mockImplementation(key => {
    return key in settings ? settings[key] : defaultSettings[key];
  });

  return mockServer;
};

const mockApplicationPrivilegeResponse = ({ hasAllRequested, privileges, application = defaultApplication, username = '' }) =>{
  return {
    username: username,
    has_all_requested: hasAllRequested,
    application: {
      [application]: {
        [DEFAULT_RESOURCE]: privileges
      }
    }
  };
};

const mockLegacyResponse = ({ hasAllRequested, privileges, index = defaultKibanaIndex, username = '' }) => {
  return {
    username: username,
    has_all_requested: hasAllRequested,
    index: {
      [index]: privileges
    }
  };
};

const createMockCallWithRequest = (responses) => {
  const mockCallWithRequest = jest.fn();
  getClient.mockReturnValue({
    callWithRequest: mockCallWithRequest
  });

  for (const response of responses) {
    mockCallWithRequest.mockImplementationOnce(async () => response);
  }

  return mockCallWithRequest;
};

test(`uses application privileges if they have all privileges`, async () => {
  const username = 'foo-username';
  const mockServer = createMockServer();
  const mockCallWithRequest = createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: true,
      privileges: {
        [getVersionPrivilege(defaultVersion)]: true,
        [getLoginPrivilege()]: true,
        foo: true,
      },
      application: defaultApplication,
      username,
    })
  ]);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = Symbol();
  const hasPrivileges = hasPrivilegesWithRequest(request);
  const privileges = ['foo'];
  const result = await hasPrivileges(privileges);

  expect(mockCallWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
    body: {
      applications: [{
        application: defaultApplication,
        resources: [DEFAULT_RESOURCE],
        privileges: [
          getVersionPrivilege(defaultVersion), getLoginPrivilege(), ...privileges
        ]
      }]
    }
  });
  expect(result).toEqual({
    success: true,
    missing: [],
    username
  });
});

test(`throws error if missing version privilege and has login privilege`, async () => {
  const mockServer = createMockServer();
  createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [getVersionPrivilege(defaultVersion)]: false,
        [getLoginPrivilege()]: true,
        foo: true,
      }
    })
  ]);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});

  await expect(hasPrivileges(['foo'])).rejects.toThrowErrorMatchingSnapshot();
});

test(`returns success of false if the user doesn't have any application privileges and no legacy privileges`, async () => {
  const username = 'foo-username';
  const mockServer = createMockServer();
  const callWithRequest = createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [getVersionPrivilege(defaultVersion)]: false,
        [getLoginPrivilege()]: false,
        foo: false,
      },
      username,
    }),
    mockLegacyResponse({
      hasAllRequested: false,
      privileges: {
        read: false,
        index: false,
      },
      username,
    })
  ]);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = Symbol();
  const hasPrivileges = hasPrivilegesWithRequest(request);
  const privileges = ['foo'];
  const result = await hasPrivileges(privileges);

  expect(callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
    body: {
      applications: [{
        application: defaultApplication,
        resources: [DEFAULT_RESOURCE],
        privileges: [
          getVersionPrivilege(defaultVersion), getLoginPrivilege(), ...privileges
        ]
      }]
    }
  });
  expect(callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
    body: {
      index: [{
        names: [ defaultKibanaIndex ],
        privileges: ['read', 'index']
      }]
    }
  });
  expect(result).toEqual({
    success: false,
    missing: [getLoginPrivilege(), ...privileges],
    username,
  });
});

test.skip(`returns missing privileges`, async () => {
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

test.skip(`excludes granted privileges from missing privileges`, async () => {
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


test.skip(`excludes version privilege when missing version privilege and missing login privilege`, async () => {
  const mockServer = createMockServer();
  mockResponse(false, {
    [getVersionPrivilege(defaultVersion)]: false,
    [getLoginPrivilege()]: false,
    foo: true,
  });

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});
  const result = await hasPrivileges(['foo']);
  expect(result.missing).toEqual([getLoginPrivilege()]);
});

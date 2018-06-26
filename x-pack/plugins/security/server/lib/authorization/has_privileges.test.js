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

const defaultVersion = 'default-version';
const defaultApplication = 'default-application';
const savedObjectTypes = ['foo-type', 'bar-type'];

const createMockServer = ({ settings = {} } = {}) => {
  const mockServer = {
    config: jest.fn().mockReturnValue({
      get: jest.fn()
    }),
    log: jest.fn()
  };

  const defaultSettings = {
    'pkg.version': defaultVersion,
    'xpack.security.rbac.application': defaultApplication
  };

  mockServer.config().get.mockImplementation(key => {
    return key in settings ? settings[key] : defaultSettings[key];
  });

  mockServer.savedObjects = {
    types: savedObjectTypes
  };

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

test(`returns success of true if they have all application privileges`, async () => {
  const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const username = 'foo-username';
  const mockServer = createMockServer();
  const mockCallWithRequest = createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: true,
      privileges: {
        [getVersionPrivilege(defaultVersion)]: true,
        [getLoginPrivilege()]: true,
        [privilege]: true,
      },
      application: defaultApplication,
      username,
    })
  ]);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = Symbol();
  const hasPrivileges = hasPrivilegesWithRequest(request);
  const privileges = [privilege];
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
    useLegacyFallback: false,
    username
  });
});

test(`returns success of false if they have only one application privilege`, async () => {
  const privilege1 = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const privilege2 = `action:saved_objects/${savedObjectTypes[0]}/create`;
  const username = 'foo-username';
  const mockServer = createMockServer();
  const mockCallWithRequest = createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [getVersionPrivilege(defaultVersion)]: true,
        [getLoginPrivilege()]: true,
        [privilege1]: true,
        [privilege2]: false,
      },
      application: defaultApplication,
      username,
    })
  ]);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = Symbol();
  const hasPrivileges = hasPrivilegesWithRequest(request);
  const privileges = [privilege1, privilege2];
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
    success: false,
    missing: [privilege2],
    useLegacyFallback: false,
    username
  });
});

test(`throws error if missing version privilege and has login privilege`, async () => {
  const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const mockServer = createMockServer();
  createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [getVersionPrivilege(defaultVersion)]: false,
        [getLoginPrivilege()]: true,
        [privilege]: true,
      }
    })
  ]);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const hasPrivileges = hasPrivilegesWithRequest({});

  await expect(hasPrivileges([privilege])).rejects.toThrowErrorMatchingSnapshot();
});

test(`returns useLegacyFallback of false if the user has the login privilege`, async () => {
  const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const username = 'foo-username';
  const mockServer = createMockServer();
  const callWithRequest = createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [getVersionPrivilege(defaultVersion)]: true,
        [getLoginPrivilege()]: true,
        [privilege]: false,
      },
      username,
    }),
  ]);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = Symbol();
  const hasPrivileges = hasPrivilegesWithRequest(request);
  const privileges = [privilege];
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
  expect(result).toHaveProperty('useLegacyFallback', false);
});

test(`returns useLegacyFallback of true if the user has the login privilege`, async () => {
  const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const username = 'foo-username';
  const mockServer = createMockServer();
  const callWithRequest = createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [getVersionPrivilege(defaultVersion)]: false,
        [getLoginPrivilege()]: false,
        [privilege]: false,
      },
      username,
    }),
  ]);

  const hasPrivilegesWithRequest = hasPrivilegesWithServer(mockServer);
  const request = Symbol();
  const hasPrivileges = hasPrivilegesWithRequest(request);
  const privileges = [privilege];
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
  expect(result).toHaveProperty('useLegacyFallback', true);
});

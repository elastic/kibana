/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkPrivilegesWithRequestFactory, CHECK_PRIVILEGES_RESULT } from './check_privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';
import { getLoginAction, getVersionAction } from '../privileges';

jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn()
}));

const defaultVersion = 'default-version';
const defaultApplication = 'default-application';
const defaultKibanaIndex = 'default-index';
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
    'xpack.security.rbac.application': defaultApplication,
    'kibana.index': defaultKibanaIndex,
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

const mockKibanaIndexPrivilegesResponse = ({ privileges, index = defaultKibanaIndex }) => {
  return {
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

const deprecationMessage = 'Relying on index privileges is deprecated and will be removed in Kibana 7.0';
const expectNoDeprecationLogged = (mockServer) => {
  expect(mockServer.log).not.toHaveBeenCalledWith(['warning', 'deprecated', 'security'], deprecationMessage);
};
const expectDeprecationLogged = (mockServer) => {
  expect(mockServer.log).toHaveBeenCalledWith(['warning', 'deprecated', 'security'], deprecationMessage);
};

test(`returns authorized if they have all application privileges`, async () => {
  const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const username = 'foo-username';
  const mockServer = createMockServer();
  const mockCallWithRequest = createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: true,
      privileges: {
        [getVersionAction(defaultVersion)]: true,
        [getLoginAction()]: true,
        [privilege]: true,
      },
      application: defaultApplication,
      username,
    })
  ]);

  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockServer);
  const request = Symbol();
  const checkPrivileges = checkPrivilegesWithRequest(request);
  const privileges = [privilege];
  const result = await checkPrivileges(privileges);

  expectNoDeprecationLogged(mockServer);
  expect(mockCallWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
    body: {
      applications: [{
        application: defaultApplication,
        resources: [DEFAULT_RESOURCE],
        privileges: [
          getVersionAction(defaultVersion), getLoginAction(), ...privileges
        ]
      }]
    }
  });
  expect(result).toEqual({
    result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
    username,
    missing: [],
  });
});

test(`returns unauthorized they have only one application privilege`, async () => {
  const privilege1 = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const privilege2 = `action:saved_objects/${savedObjectTypes[0]}/create`;
  const username = 'foo-username';
  const mockServer = createMockServer();
  const mockCallWithRequest = createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [getVersionAction(defaultVersion)]: true,
        [getLoginAction()]: true,
        [privilege1]: true,
        [privilege2]: false,
      },
      application: defaultApplication,
      username,
    })
  ]);

  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockServer);
  const request = Symbol();
  const checkPrivileges = checkPrivilegesWithRequest(request);
  const privileges = [privilege1, privilege2];
  const result = await checkPrivileges(privileges);

  expectNoDeprecationLogged(mockServer);
  expect(mockCallWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
    body: {
      applications: [{
        application: defaultApplication,
        resources: [DEFAULT_RESOURCE],
        privileges: [
          getVersionAction(defaultVersion), getLoginAction(), ...privileges
        ]
      }]
    }
  });
  expect(result).toEqual({
    result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
    username,
    missing: [privilege2],
  });
});

test(`throws error if missing version privilege and has login privilege`, async () => {
  const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const mockServer = createMockServer();
  createMockCallWithRequest([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [getVersionAction(defaultVersion)]: false,
        [getLoginAction()]: true,
        [privilege]: true,
      }
    })
  ]);

  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockServer);
  const checkPrivileges = checkPrivilegesWithRequest({});

  await expect(checkPrivileges([privilege])).rejects.toThrowErrorMatchingSnapshot();
  expectNoDeprecationLogged(mockServer);
});

describe('legacy fallback with no application privileges', () => {
  test(`returns unauthorized if they have no privileges on the kibana index`, async () => {
    const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
    const username = 'foo-username';
    const mockServer = createMockServer();
    const callWithRequest = createMockCallWithRequest([
      mockApplicationPrivilegeResponse({
        hasAllRequested: false,
        privileges: {
          [getVersionAction(defaultVersion)]: false,
          [getLoginAction()]: false,
          [privilege]: false,
        },
        username,
      }),
      mockKibanaIndexPrivilegesResponse({
        privileges: {
          create: false,
          delete: false,
          read: false,
          view_index_metadata: false,
        },
      })
    ]);

    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockServer);
    const request = Symbol();
    const checkPrivileges = checkPrivilegesWithRequest(request);
    const privileges = [privilege];
    const result = await checkPrivileges(privileges);

    expectNoDeprecationLogged(mockServer);
    expect(callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
      body: {
        applications: [{
          application: defaultApplication,
          resources: [DEFAULT_RESOURCE],
          privileges: [
            getVersionAction(defaultVersion), getLoginAction(), ...privileges
          ]
        }]
      }
    });
    expect(callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
      body: {
        index: [{
          names: [ defaultKibanaIndex ],
          privileges: ['create', 'delete', 'read', 'view_index_metadata']
        }]
      }
    });
    expect(result).toEqual({
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username,
      missing: [getLoginAction(), ...privileges],
    });
  });

  ['create', 'delete', 'read', 'view_index_metadata'].forEach(indexPrivilege => {
    test(`returns legacy if they have ${indexPrivilege} privilege on the kibana index`, async () => {
      const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
      const username = 'foo-username';
      const mockServer = createMockServer();
      const callWithRequest = createMockCallWithRequest([
        mockApplicationPrivilegeResponse({
          hasAllRequested: false,
          privileges: {
            [getVersionAction(defaultVersion)]: false,
            [getLoginAction()]: false,
            [privilege]: false,
          },
          username,
        }),
        mockKibanaIndexPrivilegesResponse({
          privileges: {
            create: false,
            delete: false,
            read: false,
            view_index_metadata: false,
            [indexPrivilege]: true
          },
        })
      ]);

      const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockServer);
      const request = Symbol();
      const checkPrivileges = checkPrivilegesWithRequest(request);
      const privileges = [privilege];
      const result = await checkPrivileges(privileges);

      expectDeprecationLogged(mockServer);
      expect(callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application: defaultApplication,
            resources: [DEFAULT_RESOURCE],
            privileges: [
              getVersionAction(defaultVersion), getLoginAction(), ...privileges
            ]
          }]
        }
      });
      expect(callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          index: [{
            names: [ defaultKibanaIndex ],
            privileges: ['create', 'delete', 'read', 'view_index_metadata']
          }]
        }
      });
      expect(result).toEqual({
        result: CHECK_PRIVILEGES_RESULT.LEGACY,
        username,
        missing: [getLoginAction(), ...privileges],
      });
    });
  });
});

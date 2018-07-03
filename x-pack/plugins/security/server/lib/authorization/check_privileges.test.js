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

test(`returns unauthorized if they have only one application action`, async () => {
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
});

describe('legacy fallback with no application privileges', () => {
  describe('they have no privileges on the kibana index', () => {
    test(`returns unauthorized and missing application action if checking application action `, async () => {
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
        missing: [...privileges],
      });
    });

    test(`returns unauthorized and missing login if checking login action`, async () => {
      const privilege = getLoginAction();
      const username = 'foo-username';
      const mockServer = createMockServer();
      const callWithRequest = createMockCallWithRequest([
        mockApplicationPrivilegeResponse({
          hasAllRequested: false,
          privileges: {
            [getVersionAction(defaultVersion)]: false,
            [getLoginAction()]: false,
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
      const result = await checkPrivileges([privilege]);

      expect(callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application: defaultApplication,
            resources: [DEFAULT_RESOURCE],
            privileges: [
              getVersionAction(defaultVersion), ...privileges
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
        missing: [...privileges],
      });
    });

    test(`returns unauthorized and missing version if checking version action`, async () => {
      const privilege = getVersionAction(defaultVersion);
      const username = 'foo-username';
      const mockServer = createMockServer();
      const callWithRequest = createMockCallWithRequest([
        mockApplicationPrivilegeResponse({
          hasAllRequested: false,
          privileges: {
            [getVersionAction(defaultVersion)]: false,
            [getLoginAction()]: false,
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
      const result = await checkPrivileges([privilege]);

      expect(callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application: defaultApplication,
            resources: [DEFAULT_RESOURCE],
            privileges: [
              ...privileges, getLoginAction()
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
        missing: [...privileges],
      });
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
        missing: [...privileges],
      });
    });
  });
});

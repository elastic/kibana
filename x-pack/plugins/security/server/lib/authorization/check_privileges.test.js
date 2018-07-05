/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkPrivilegesWithRequestFactory, CHECK_PRIVILEGES_RESULT } from './check_privileges';

import { ALL_RESOURCE } from '../../../common/constants';

const defaultVersion = 'default-version';
const defaultApplication = 'default-application';
const defaultKibanaIndex = 'default-index';
const savedObjectTypes = ['foo-type', 'bar-type'];

const createMockActions = () => {
  return {
    login: 'mock-action:login',
    version: 'mock-action:version',
  };
};

const createMockConfig = ({ settings = {} } = {}) => {
  const mockConfig = {
    get: jest.fn()
  };

  const defaultSettings = {
    'pkg.version': defaultVersion,
    'xpack.security.rbac.application': defaultApplication,
    'kibana.index': defaultKibanaIndex,
  };

  mockConfig.get.mockImplementation(key => {
    return key in settings ? settings[key] : defaultSettings[key];
  });


  return mockConfig;
};

const mockApplicationPrivilegeResponse = ({ hasAllRequested, privileges, application = defaultApplication, username = '' }) =>{
  return {
    username: username,
    has_all_requested: hasAllRequested,
    application: {
      [application]: {
        [ALL_RESOURCE]: privileges
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

const createMockShieldClient = (responses) => {
  const mockCallWithRequest = jest.fn();

  for (const response of responses) {
    mockCallWithRequest.mockImplementationOnce(async () => response);
  }

  return {
    callWithRequest: mockCallWithRequest,
  };
};

test(`returns authorized if they have all application privileges`, async () => {
  const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
  const username = 'foo-username';
  const mockConfig = createMockConfig();
  const mockActions = createMockActions();
  const mockShieldClient = createMockShieldClient([
    mockApplicationPrivilegeResponse({
      hasAllRequested: true,
      privileges: {
        [mockActions.version]: true,
        [mockActions.login]: true,
        [privilege]: true,
      },
      application: defaultApplication,
      username,
    })
  ]);

  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockShieldClient, mockConfig, mockActions);
  const request = Symbol();
  const checkPrivileges = checkPrivilegesWithRequest(request);
  const privileges = [privilege];
  const result = await checkPrivileges(privileges);

  expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
    body: {
      applications: [{
        application: defaultApplication,
        resources: [ALL_RESOURCE],
        privileges: [
          mockActions.version, mockActions.login, ...privileges
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
  const mockConfig = createMockConfig();
  const mockActions = createMockActions();
  const mockShieldClient = createMockShieldClient([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [mockActions.version]: true,
        [mockActions.login]: true,
        [privilege1]: true,
        [privilege2]: false,
      },
      application: defaultApplication,
      username,
    })
  ]);

  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockShieldClient, mockConfig, mockActions);
  const request = Symbol();
  const checkPrivileges = checkPrivilegesWithRequest(request);
  const privileges = [privilege1, privilege2];
  const result = await checkPrivileges(privileges);

  expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
    body: {
      applications: [{
        application: defaultApplication,
        resources: [ALL_RESOURCE],
        privileges: [
          mockActions.version, mockActions.login, ...privileges
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
  const mockConfig = createMockConfig();
  const mockActions = createMockActions();
  const mockShieldClient = createMockShieldClient([
    mockApplicationPrivilegeResponse({
      hasAllRequested: false,
      privileges: {
        [mockActions.version]: false,
        [mockActions.login]: true,
        [privilege]: true,
      }
    })
  ]);

  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockShieldClient, mockConfig, mockActions);
  const checkPrivileges = checkPrivilegesWithRequest({});

  await expect(checkPrivileges([privilege])).rejects.toThrowErrorMatchingSnapshot();
});

describe('legacy fallback with no application privileges', () => {
  describe('they have no privileges on the kibana index', () => {
    test(`returns unauthorized and missing application action when checking application action `, async () => {
      const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
      const username = 'foo-username';
      const mockConfig = createMockConfig();
      const mockActions = createMockActions();
      const mockShieldClient = createMockShieldClient([
        mockApplicationPrivilegeResponse({
          hasAllRequested: false,
          privileges: {
            [mockActions.version]: false,
            [mockActions.login]: false,
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

      const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockShieldClient, mockConfig, mockActions);
      const request = Symbol();
      const checkPrivileges = checkPrivilegesWithRequest(request);
      const privileges = [privilege];
      const result = await checkPrivileges(privileges);

      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application: defaultApplication,
            resources: [ALL_RESOURCE],
            privileges: [
              mockActions.version, mockActions.login, ...privileges
            ]
          }]
        }
      });
      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
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

    test(`returns unauthorized and missing login when checking login action`, async () => {
      const username = 'foo-username';
      const mockConfig = createMockConfig();
      const mockActions = createMockActions();
      const mockShieldClient = createMockShieldClient([
        mockApplicationPrivilegeResponse({
          hasAllRequested: false,
          privileges: {
            [mockActions.version]: false,
            [mockActions.login]: false,
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

      const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockShieldClient, mockConfig, mockActions);
      const request = Symbol();
      const checkPrivileges = checkPrivilegesWithRequest(request);
      const result = await checkPrivileges([mockActions.login]);

      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application: defaultApplication,
            resources: [ALL_RESOURCE],
            privileges: [
              mockActions.version, mockActions.login
            ]
          }]
        }
      });
      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
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
        missing: [mockActions.login],
      });
    });

    test(`returns unauthorized and missing version if checking version action`, async () => {
      const username = 'foo-username';
      const mockConfig = createMockConfig();
      const mockActions = createMockActions();
      const mockShieldClient = createMockShieldClient([
        mockApplicationPrivilegeResponse({
          hasAllRequested: false,
          privileges: {
            [mockActions.version]: false,
            [mockActions.login]: false,
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

      const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockShieldClient, mockConfig, mockActions);
      const request = Symbol();
      const checkPrivileges = checkPrivilegesWithRequest(request);

      const result = await checkPrivileges([mockActions.version]);

      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application: defaultApplication,
            resources: [ALL_RESOURCE],
            privileges: [
              mockActions.version, mockActions.login
            ]
          }]
        }
      });
      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
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
        missing: [mockActions.version],
      });
    });
  });

  ['create', 'delete', 'read', 'view_index_metadata'].forEach(indexPrivilege => {
    test(`returns legacy if they have ${indexPrivilege} privilege on the kibana index`, async () => {
      const privilege = `action:saved_objects/${savedObjectTypes[0]}/get`;
      const username = 'foo-username';
      const mockConfig = createMockConfig();
      const mockActions = createMockActions();
      const mockShieldClient = createMockShieldClient([
        mockApplicationPrivilegeResponse({
          hasAllRequested: false,
          privileges: {
            [mockActions.version]: false,
            [mockActions.login]: false,
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

      const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockShieldClient, mockConfig, mockActions);
      const request = Symbol();
      const checkPrivileges = checkPrivilegesWithRequest(request);
      const privileges = [privilege];
      const result = await checkPrivileges(privileges);

      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application: defaultApplication,
            resources: [ALL_RESOURCE],
            privileges: [
              mockActions.version, mockActions.login, ...privileges
            ]
          }]
        }
      });
      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { checkPrivilegesWithRequestFactory, CHECK_PRIVILEGES_RESULT } from './check_privileges';

import { ALL_RESOURCE } from '../../../common/constants';

const application = 'kibana-our_application';
const defaultVersion = 'default-version';
const defaultKibanaIndex = 'default-index';
const savedObjectTypes = ['foo-type', 'bar-type'];

const mockActions = {
  login: 'mock-action:login',
  version: 'mock-action:version',
};

const createMockConfig = (settings = {}) => {
  const mockConfig = {
    get: jest.fn()
  };

  const defaultSettings = {
    'pkg.version': defaultVersion,
    'kibana.index': defaultKibanaIndex,
    'xpack.security.authorization.legacyFallback.enabled': true,
  };

  mockConfig.get.mockImplementation(key => {
    return key in settings ? settings[key] : defaultSettings[key];
  });

  return mockConfig;
};

const createMockShieldClient = (response) => {
  const mockCallWithRequest = jest.fn();

  mockCallWithRequest.mockImplementationOnce(async () => response);

  return {
    callWithRequest: mockCallWithRequest,
  };
};

const checkPrivilegesTest = (
  description, {
    settings,
    privileges,
    applicationPrivilegesResponse,
    indexPrivilegesResponse,
    expectedResult,
    expectErrorThrown,
  }) => {

  test(description, async () => {
    const username = 'foo-username';
    const mockConfig = createMockConfig(settings);
    const mockShieldClient = createMockShieldClient({
      username,
      application: {
        [application]: {
          [ALL_RESOURCE]: applicationPrivilegesResponse
        }
      },
      index: {
        [defaultKibanaIndex]: indexPrivilegesResponse
      },
    });

    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockShieldClient, mockConfig, mockActions, application);
    const request = Symbol();
    const checkPrivileges = checkPrivilegesWithRequest(request);

    let actualResult;
    let errorThrown = null;
    try {
      actualResult = await checkPrivileges(privileges);
    } catch (err) {
      errorThrown = err;
    }


    expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
      body: {
        applications: [{
          application,
          resources: [ALL_RESOURCE],
          privileges: uniq([
            mockActions.version, mockActions.login, ...privileges
          ])
        }],
        index: [{
          names: [defaultKibanaIndex],
          privileges: ['create', 'delete', 'read', 'view_index_metadata']
        }],
      }
    });

    if (expectedResult) {
      expect(errorThrown).toBeNull();
      expect(actualResult).toEqual(expectedResult);
    }

    if (expectErrorThrown) {
      expect(errorThrown).toMatchSnapshot();
    }
  });
};

describe(`with no index privileges`, () => {
  const indexPrivilegesResponse = {
    create: false,
    delete: false,
    read: false,
    view_index_metadata: false,
  };

  checkPrivilegesTest('returns authorized if they have all application privileges', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`
    ],
    applicationPrivilegesResponse: {
      [mockActions.version]: true,
      [mockActions.login]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
      username: 'foo-username',
      missing: [],
    }
  });

  checkPrivilegesTest('returns unauthorized and missing application action when checking missing application action', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`,
      `action:saved_objects/${savedObjectTypes[0]}/create`,
    ],
    applicationPrivilegesResponse: {
      [mockActions.version]: true,
      [mockActions.login]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/create`]: false,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username: 'foo-username',
      missing: [`action:saved_objects/${savedObjectTypes[0]}/create`],
    }
  });

  checkPrivilegesTest('returns unauthorized and missing login when checking missing login action', {
    username: 'foo-username',
    privileges: [
      mockActions.login
    ],
    applicationPrivilegesResponse: {
      [mockActions.login]: false,
      [mockActions.version]: false,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username: 'foo-username',
      missing: [mockActions.login],
    }
  });

  checkPrivilegesTest('returns unauthorized and missing version if checking missing version action', {
    username: 'foo-username',
    privileges: [
      mockActions.version
    ],
    applicationPrivilegesResponse: {
      [mockActions.login]: false,
      [mockActions.version]: false,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username: 'foo-username',
      missing: [mockActions.version],
    }
  });

  checkPrivilegesTest('throws error if missing version privilege and has login privilege', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`
    ],
    applicationPrivilegesResponse: {
      [mockActions.login]: true,
      [mockActions.version]: false,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
    },
    indexPrivilegesResponse,
    expectErrorThrown: true
  });
});

describe(`with index privileges`, () => {
  const indexPrivilegesResponse = {
    create: true,
    delete: true,
    read: true,
    view_index_metadata: true,
  };

  checkPrivilegesTest('returns authorized if they have all application privileges', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`
    ],
    applicationPrivilegesResponse: {
      [mockActions.version]: true,
      [mockActions.login]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
      username: 'foo-username',
      missing: [],
    }
  });

  checkPrivilegesTest('returns unauthorized and missing application action when checking missing application action', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`,
      `action:saved_objects/${savedObjectTypes[0]}/create`,
    ],
    applicationPrivilegesResponse: {
      [mockActions.version]: true,
      [mockActions.login]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/create`]: false,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username: 'foo-username',
      missing: [`action:saved_objects/${savedObjectTypes[0]}/create`],
    }
  });

  checkPrivilegesTest('returns legacy and missing login when checking missing login action and fallback is enabled', {
    username: 'foo-username',
    privileges: [
      mockActions.login
    ],
    applicationPrivilegesResponse: {
      [mockActions.login]: false,
      [mockActions.version]: false,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.LEGACY,
      username: 'foo-username',
      missing: [mockActions.login],
    }
  });

  checkPrivilegesTest('returns unauthorized and missing login when checking missing login action and fallback is disabled', {
    settings: {
      'xpack.security.authorization.legacyFallback.enabled': false,
    },
    username: 'foo-username',
    privileges: [
      mockActions.login
    ],
    applicationPrivilegesResponse: {
      [mockActions.login]: false,
      [mockActions.version]: false,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username: 'foo-username',
      missing: [mockActions.login],
    }
  });

  checkPrivilegesTest('returns legacy and missing version if checking missing version action and fallback is enabled', {
    username: 'foo-username',
    privileges: [
      mockActions.version
    ],
    applicationPrivilegesResponse: {
      [mockActions.login]: false,
      [mockActions.version]: false,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.LEGACY,
      username: 'foo-username',
      missing: [mockActions.version],
    }
  });

  checkPrivilegesTest('returns unauthorized and missing version if checking missing version action and fallback is disabled', {
    settings: {
      'xpack.security.authorization.legacyFallback.enabled': false,
    },
    username: 'foo-username',
    privileges: [
      mockActions.version
    ],
    applicationPrivilegesResponse: {
      [mockActions.login]: false,
      [mockActions.version]: false,
    },
    indexPrivilegesResponse,
    expectedResult: {
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username: 'foo-username',
      missing: [mockActions.version],
    }
  });

  checkPrivilegesTest('throws error if missing version privilege and has login privilege', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`
    ],
    applicationPrivilegesResponse: {
      [mockActions.login]: true,
      [mockActions.version]: false,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
    },
    indexPrivilegesResponse,
    expectErrorThrown: true
  });
});

describe('with no application privileges', () => {
  ['create', 'delete', 'read', 'view_index_metadata'].forEach(indexPrivilege => {
    checkPrivilegesTest(`returns legacy if they have ${indexPrivilege} privilege on the kibana index and fallback is enabled`, {
      username: 'foo-username',
      privileges: [
        `action:saved_objects/${savedObjectTypes[0]}/get`
      ],
      applicationPrivilegesResponse: {
        [mockActions.version]: false,
        [mockActions.login]: false,
        [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
      },
      indexPrivilegesResponse: {
        create: false,
        delete: false,
        read: false,
        view_index_metadata: false,
        [indexPrivilege]: true
      },
      expectedResult: {
        result: CHECK_PRIVILEGES_RESULT.LEGACY,
        username: 'foo-username',
        missing: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      }
    });

    checkPrivilegesTest(`returns unauthorized if they have ${indexPrivilege} privilege on the kibana index and fallback is disabled`, {
      settings: {
        'xpack.security.authorization.legacyFallback.enabled': false,
      },
      username: 'foo-username',
      privileges: [
        `action:saved_objects/${savedObjectTypes[0]}/get`
      ],
      applicationPrivilegesResponse: {
        [mockActions.version]: false,
        [mockActions.login]: false,
        [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
      },
      indexPrivilegesResponse: {
        create: false,
        delete: false,
        read: false,
        view_index_metadata: false,
        [indexPrivilege]: true
      },
      expectedResult: {
        result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
        username: 'foo-username',
        missing: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      }
    });
  });
});

describe('with a malformed Elasticsearch response', () => {
  const indexPrivilegesResponse = {
    create: true,
    delete: true,
    read: true,
    view_index_metadata: true,
  };

  checkPrivilegesTest('throws a validation error when an extra privilege is present in the response', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`,
    ],
    applicationPrivilegesResponse: {
      [mockActions.version]: true,
      [mockActions.login]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
      ['oops-an-unexpected-privilege']: true,
    },
    indexPrivilegesResponse,
    expectErrorThrown: true,
  });

  checkPrivilegesTest('throws a validation error when privileges are missing in the response', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`,
    ],
    applicationPrivilegesResponse: {
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
    },
    indexPrivilegesResponse,
    expectErrorThrown: true,
  });

  checkPrivilegesTest('throws a validation error when an extra index privilege is present in the response', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`,
    ],
    applicationPrivilegesResponse: {
      [mockActions.version]: true,
      [mockActions.login]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
    },
    indexPrivilegesResponse: {
      ...indexPrivilegesResponse,
      oopsAnExtraPrivilege: true,
    },
    expectErrorThrown: true,
  });

  const missingIndexPrivileges = {
    ...indexPrivilegesResponse
  };
  delete missingIndexPrivileges.read;

  checkPrivilegesTest('throws a validation error when index privileges are missing in the response', {
    username: 'foo-username',
    privileges: [
      `action:saved_objects/${savedObjectTypes[0]}/get`,
    ],
    applicationPrivilegesResponse: {
      [mockActions.version]: true,
      [mockActions.login]: true,
      [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
    },
    indexPrivilegesResponse: missingIndexPrivileges,
    expectErrorThrown: true,
  });
});

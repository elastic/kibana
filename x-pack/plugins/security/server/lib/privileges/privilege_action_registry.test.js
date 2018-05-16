/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerPrivilegesWithCluster } from './privilege_action_registry';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { buildPrivilegeMap } from './privileges';
jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));
jest.mock('./privileges', () => ({
  buildPrivilegeMap: jest.fn(),
}));

const registerPrivilegesWithClusterTest = (description, { settings = {}, expectedPrivileges, existingPrivileges, assert }) => {
  const registerMockCallWithInternalUser = () => {
    const callWithInternalUser = jest.fn();
    getClient.mockReturnValue({
      callWithInternalUser,
    });
    return callWithInternalUser;
  };

  const defaultVersion = 'default-version';
  const defaultApplication = 'default-application';

  const createMockServer = () => {
    const mockServer = {
      config: jest.fn().mockReturnValue({
        get: jest.fn(),
      }),
      log: jest.fn(),
    };

    const defaultSettings = {
      'pkg.version': defaultVersion,
      'xpack.security.rbac.application': defaultApplication,
    };

    mockServer.config().get.mockImplementation(key => {
      return key in settings ? settings[key] : defaultSettings[key];
    });

    return mockServer;
  };

  const createExpectUpdatedPrivileges = (mockServer, mockCallWithInternalUser, privileges) => {
    return () => {
      expect(mockCallWithInternalUser).toHaveBeenCalledTimes(2);
      expect(mockCallWithInternalUser).toHaveBeenCalledWith('shield.getPrivilege', {
        privilege: defaultApplication,
      });
      expect(mockCallWithInternalUser).toHaveBeenCalledWith(
        'shield.postPrivileges',
        {
          body: privileges,
        }
      );

      const application = settings['xpack.security.rbac.application'] || defaultApplication;
      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'debug'],
        `Registering Kibana Privileges with Elasticsearch for ${application}`
      );
      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'debug'],
        `Updated Kibana Privileges with Elasticearch for ${application}`
      );
    };
  };

  const createExpectDidntUpdatePrivileges = (mockServer, mockCallWithInternalUser) => {
    return () => {
      expect(mockCallWithInternalUser).toHaveBeenCalledTimes(1);
      expect(mockCallWithInternalUser).toHaveBeenLastCalledWith('shield.getPrivilege', {
        privilege: defaultApplication
      });

      const application = settings['xpack.security.rbac.application'] || defaultApplication;
      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'debug'],
        `Registering Kibana Privileges with Elasticsearch for ${application}`
      );
      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'debug'],
        `Kibana Privileges already registered with Elasticearch for ${application}`
      );
    };
  };

  test(description, async () => {
    const mockServer = createMockServer();
    const mockCallWithInternalUser = registerMockCallWithInternalUser();
    mockCallWithInternalUser.mockImplementationOnce(async () => (existingPrivileges));
    buildPrivilegeMap.mockReturnValue(expectedPrivileges);

    await registerPrivilegesWithCluster(mockServer);

    assert({
      expectUpdatedPrivileges: createExpectUpdatedPrivileges(mockServer, mockCallWithInternalUser, expectedPrivileges),
      expectDidntUpdatePrivileges: createExpectDidntUpdatePrivileges(mockServer, mockCallWithInternalUser),
      mocks: {
        buildPrivilegeMap
      }
    });
  });
};

registerPrivilegesWithClusterTest(`passes application and kibanaVersion to buildPrivilegeMap`, {
  settings: {
    'pkg.version': 'foo-version',
    'xpack.security.rbac.application': 'foo-application',
  },
  assert: ({ mocks }) => {
    expect(mocks.buildPrivilegeMap).toHaveBeenCalledWith('foo-application', 'foo-version');
  },
});

registerPrivilegesWithClusterTest(`updates privileges when simple top-level privileges don't match`, {
  expectedPrivileges: {
    expected: true
  },
  existingPrivileges: {
    expected: false
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges();
  }
});

registerPrivilegesWithClusterTest(`updates privileges when nested privileges don't match`, {
  expectedPrivileges: {
    kibana: {
      expected: true
    }
  },
  existingPrivileges: {
    kibana: {
      expected: false
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges();
  }
});

registerPrivilegesWithClusterTest(`updates privileges when nested privileges arrays don't match`, {
  expectedPrivileges: {
    kibana: {
      expected: ['one', 'two']
    }
  },
  existingPrivileges: {
    kibana: {
      expected: ['one']
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges();
  }
});

registerPrivilegesWithClusterTest(`updates privileges when nested propertry array values are reordered`, {
  expectedPrivileges: {
    kibana: {
      foo: ['one', 'two']
    }
  },
  existingPrivileges: {
    kibana: {
      foo: ['two', 'one']
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges();
  }
});

registerPrivilegesWithClusterTest(`doesn't update privileges when simple top-level privileges match`, {
  expectedPrivileges: {
    expected: true
  },
  existingPrivileges: {
    expected: true
  },
  assert: ({ expectDidntUpdatePrivileges }) => {
    expectDidntUpdatePrivileges();
  }
});

registerPrivilegesWithClusterTest(`doesn't update privileges when nested properties are reordered`, {
  expectedPrivileges: {
    kibana: {
      foo: true,
      bar: false
    }
  },
  existingPrivileges: {
    kibana: {
      bar: false,
      foo: true
    }
  },
  assert: ({ expectDidntUpdatePrivileges }) => {
    expectDidntUpdatePrivileges();
  }
});

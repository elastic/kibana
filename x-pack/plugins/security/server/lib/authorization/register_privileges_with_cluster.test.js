/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerPrivilegesWithCluster } from './register_privileges_with_cluster';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { buildPrivilegeMap } from './privileges';
jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));
jest.mock('./privileges', () => ({
  buildPrivilegeMap: jest.fn(),
}));

const registerPrivilegesWithClusterTest = (description, {
  settings = {},
  savedObjectTypes,
  expectedPrivileges,
  existingPrivileges,
  throwErrorWhenGettingPrivileges,
  throwErrorWhenPuttingPrivileges,
  assert
}) => {
  const registerMockCallWithInternalUser = () => {
    const callWithInternalUser = jest.fn();
    getClient.mockReturnValue({
      callWithInternalUser,
    });
    return callWithInternalUser;
  };

  const defaultVersion = 'default-version';
  const application = 'default-application';

  const createMockServer = () => {
    const mockServer = {
      config: jest.fn().mockReturnValue({
        get: jest.fn(),
      }),
      log: jest.fn(),
      plugins: {
        security: {
          authorization: {
            actions: Symbol(),
            application
          }
        }
      }
    };

    const defaultSettings = {
      'pkg.version': defaultVersion,
    };

    mockServer.config().get.mockImplementation(key => {
      return key in settings ? settings[key] : defaultSettings[key];
    });

    mockServer.savedObjects = {
      types: savedObjectTypes
    };

    return mockServer;
  };

  const createExpectUpdatedPrivileges = (mockServer, mockCallWithInternalUser, privileges, error) => {
    return () => {
      expect(error).toBeUndefined();
      expect(mockCallWithInternalUser).toHaveBeenCalledTimes(2);
      expect(mockCallWithInternalUser).toHaveBeenCalledWith('shield.getPrivilege', {
        privilege: application,
      });
      expect(mockCallWithInternalUser).toHaveBeenCalledWith(
        'shield.postPrivileges',
        {
          body: {
            [application]: privileges
          },
        }
      );

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

  const createExpectDidntUpdatePrivileges = (mockServer, mockCallWithInternalUser, error) => {
    return () => {
      expect(error).toBeUndefined();
      expect(mockCallWithInternalUser).toHaveBeenCalledTimes(1);
      expect(mockCallWithInternalUser).toHaveBeenLastCalledWith('shield.getPrivilege', {
        privilege: application
      });

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

  const createExpectErrorThrown = (mockServer, actualError) => {
    return (expectedErrorMessage) => {
      expect(actualError).toBeDefined();
      expect(actualError).toBeInstanceOf(Error);
      expect(actualError.message).toEqual(expectedErrorMessage);

      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'error'],
        `Error registering Kibana Privileges with Elasticsearch for ${application}: ${expectedErrorMessage}`
      );
    };
  };

  test(description, async () => {
    const mockServer = createMockServer();
    const mockCallWithInternalUser = registerMockCallWithInternalUser()
      .mockImplementationOnce(async () => {
        if (throwErrorWhenGettingPrivileges) {
          throw throwErrorWhenGettingPrivileges;
        }

        // ES returns an empty object if we don't have any privileges
        if (!existingPrivileges) {
          return {};
        }

        return {
          [application]: existingPrivileges
        };
      })
      .mockImplementationOnce(async () => {
        if (throwErrorWhenPuttingPrivileges) {
          throw throwErrorWhenPuttingPrivileges;
        }
      });

    buildPrivilegeMap.mockReturnValue(expectedPrivileges);

    let error;
    try {
      await registerPrivilegesWithCluster(mockServer);
    } catch (err) {
      error = err;
    }

    assert({
      expectUpdatedPrivileges: createExpectUpdatedPrivileges(mockServer, mockCallWithInternalUser, expectedPrivileges, error),
      expectDidntUpdatePrivileges: createExpectDidntUpdatePrivileges(mockServer, mockCallWithInternalUser, error),
      expectErrorThrown: createExpectErrorThrown(mockServer, error),
      mocks: {
        buildPrivilegeMap,
        server: mockServer,
      }
    });
  });
};

registerPrivilegesWithClusterTest(`passes saved object types, application and actions to buildPrivilegeMap`, {
  settings: {
    'pkg.version': 'foo-version'
  },
  savedObjectTypes: [
    'foo-type',
    'bar-type',
  ],
  assert: ({ mocks }) => {
    expect(mocks.buildPrivilegeMap).toHaveBeenCalledWith(
      ['foo-type', 'bar-type'],
      mocks.server.plugins.security.authorization.application,
      mocks.server.plugins.security.authorization.actions,
    );
  },
});

registerPrivilegesWithClusterTest(`inserts privileges when we don't have any existing privileges`, {
  expectedPrivileges: {
    expected: true
  },
  existingPrivileges: null,
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges();
  }
});

registerPrivilegesWithClusterTest(`updates privileges when simple top-level privileges values don't match`, {
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

registerPrivilegesWithClusterTest(`throws error when we have two different top-level privileges`, {
  expectedPrivileges: {
    notExpected: true
  },
  existingPrivileges: {
    expected: true
  },
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown(`Privileges are missing and can't be removed, currently.`);
  }
});

registerPrivilegesWithClusterTest(`updates privileges when we want to add a top-level privilege`, {
  expectedPrivileges: {
    expected: true,
    new: false,
  },
  existingPrivileges: {
    expected: true,
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges();
  }
});

registerPrivilegesWithClusterTest(`updates privileges when nested privileges values don't match`, {
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

registerPrivilegesWithClusterTest(`updates privileges when we have two different nested privileges`, {
  expectedPrivileges: {
    kibana: {
      notExpected: true
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

registerPrivilegesWithClusterTest(`updates privileges when nested property array values are reordered`, {
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

registerPrivilegesWithClusterTest(`throws and logs error when errors getting privileges`, {
  throwErrorWhenGettingPrivileges: new Error('Error getting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error getting privileges');
  }
});

registerPrivilegesWithClusterTest(`throws and logs error when errors putting privileges`, {
  expectedPrivileges: {
    kibana: {
      foo: false,
      bar: false
    }
  },
  existingPrivileges: {
    kibana: {
      foo: true,
      bar: true
    }
  },
  throwErrorWhenPuttingPrivileges: new Error('Error putting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error putting privileges');
  }
});

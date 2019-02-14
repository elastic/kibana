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

const application = 'default-application';

const registerPrivilegesWithClusterTest = (description, {
  settings = {},
  savedObjectTypes,
  privilegeMap,
  existingPrivileges,
  throwErrorWhenDeletingPrivileges,
  errorDeletingPrivilegeName,
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

  const createExpectUpdatedPrivileges = (mockServer, mockCallWithInternalUser, error) => {
    return (postPrivilegesBody, deletedPrivileges = []) => {
      expect(error).toBeUndefined();
      expect(mockCallWithInternalUser).toHaveBeenCalledTimes(2 + deletedPrivileges.length);
      expect(mockCallWithInternalUser).toHaveBeenCalledWith('shield.getPrivilege', {
        privilege: application,
      });
      expect(mockCallWithInternalUser).toHaveBeenCalledWith(
        'shield.postPrivileges',
        {
          body: postPrivilegesBody,
        }
      );
      for (const deletedPrivilege of deletedPrivileges) {
        expect(mockServer.log).toHaveBeenCalledWith(
          ['security', 'debug'],
          `Deleting Kibana Privilege ${deletedPrivilege} from Elasticearch for ${application}`
        );
        expect(mockCallWithInternalUser).toHaveBeenCalledWith(
          'shield.deletePrivilege',
          {
            application,
            privilege: deletedPrivilege
          }
        );
      }
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

      if (throwErrorWhenDeletingPrivileges) {
        expect(mockServer.log).toHaveBeenCalledWith(
          ['security', 'error'],
          `Error deleting Kibana Privilege ${errorDeletingPrivilegeName}`
        );
      }

      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'error'],
        `Error registering Kibana Privileges with Elasticsearch for ${application}: ${expectedErrorMessage}`
      );
    };
  };

  test(description, async () => {
    const mockServer = createMockServer();
    const mockCallWithInternalUser = registerMockCallWithInternalUser()
      .mockImplementation((api) => {
        switch(api) {
          case 'shield.getPrivilege': {
            if (throwErrorWhenGettingPrivileges) {
              throw throwErrorWhenGettingPrivileges;
            }

            // ES returns an empty object if we don't have any privileges
            if (!existingPrivileges) {
              return {};
            }

            return existingPrivileges;
          }
          case 'shield.deletePrivilege': {
            if (throwErrorWhenDeletingPrivileges) {
              throw throwErrorWhenDeletingPrivileges;
            }

            break;
          }
          case 'shield.postPrivileges': {
            if (throwErrorWhenPuttingPrivileges) {
              throw throwErrorWhenPuttingPrivileges;
            }

            return;
          }
          default: {
            expect(true).toBe(false);
          }
        }
      });

    buildPrivilegeMap.mockReturnValue(privilegeMap);

    let error;
    try {
      await registerPrivilegesWithCluster(mockServer);
    } catch (err) {
      error = err;
    }

    assert({
      expectUpdatedPrivileges: createExpectUpdatedPrivileges(mockServer, mockCallWithInternalUser, error),
      expectDidntUpdatePrivileges: createExpectDidntUpdatePrivileges(mockServer, mockCallWithInternalUser, error),
      expectErrorThrown: createExpectErrorThrown(mockServer, error),
      mocks: {
        buildPrivilegeMap,
        server: mockServer,
      }
    });
  });
};

registerPrivilegesWithClusterTest(`passes saved object types, and actions to buildPrivilegeMap`, {
  savedObjectTypes: [
    'foo-type',
    'bar-type',
  ],
  assert: ({ mocks }) => {
    expect(mocks.buildPrivilegeMap).toHaveBeenCalledWith(
      ['foo-type', 'bar-type'],
      mocks.server.plugins.security.authorization.actions,
    );
  },
});

registerPrivilegesWithClusterTest(`inserts privileges when we don't have any existing privileges`, {
  privilegeMap: {
    global: {
      foo: ['action:foo']
    },
    space: {
      bar: ['action:bar']
    }
  },
  existingPrivileges: null,
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        foo: {
          application,
          name: 'foo',
          actions: ['action:foo'],
          metadata: {},
        },
        space_bar: {
          application,
          name: 'space_bar',
          actions: ['action:bar'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`deletes no-longer specified privileges`, {
  privilegeMap: {
    global: {
      foo: ['action:foo'],
    },
    space: {
      bar: ['action:bar']
    }
  },
  existingPrivileges: {
    [application]: {
      foo: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      quz: {
        application,
        name: 'quz',
        actions: ['action:not-quz'],
        metadata: {},
      },
      space_bar: {
        application,
        name: 'space_bar',
        actions: ['action:not-bar'],
        metadata: {},
      },
      space_baz: {
        application,
        name: 'space_baz',
        actions: ['action:not-baz'],
        metadata: {},
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        foo: {
          application,
          name: 'foo',
          actions: ['action:foo'],
          metadata: {},
        },
        space_bar: {
          application,
          name: 'space_bar',
          actions: ['action:bar'],
          metadata: {},
        }
      }
    }, [ 'quz', 'space_baz' ]);
  }
});

registerPrivilegesWithClusterTest(`updates privileges when actions don't match`, {
  privilegeMap: {
    global: {
      foo: ['action:foo']
    },
    space: {
      bar: ['action:bar']
    }
  },
  existingPrivileges: {
    [application]: {
      foo: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      space_bar: {
        application,
        name: 'space_bar',
        actions: ['action:not-bar'],
        metadata: {},
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        foo: {
          application,
          name: 'foo',
          actions: ['action:foo'],
          metadata: {},
        },
        space_bar: {
          application,
          name: 'space_bar',
          actions: ['action:bar'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when global privilege added`, {
  privilegeMap: {
    global: {
      foo: ['action:foo'],
      quz: ['action:quz']
    },
    space: {
      bar: ['action:bar']
    }
  },
  existingPrivileges: {
    [application]: {
      foo: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      space_bar: {
        application,
        name: 'space_bar',
        actions: ['action:not-bar'],
        metadata: {},
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        foo: {
          application,
          name: 'foo',
          actions: ['action:foo'],
          metadata: {},
        },
        quz: {
          application,
          name: 'quz',
          actions: ['action:quz'],
          metadata: {},
        },
        space_bar: {
          application,
          name: 'space_bar',
          actions: ['action:bar'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when space privilege added`, {
  privilegeMap: {
    global: {
      foo: ['action:foo'],
    },
    space: {
      bar: ['action:bar'],
      quz: ['action:quz']
    }
  },
  existingPrivileges: {
    [application]: {
      foo: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      space_bar: {
        application,
        name: 'space_bar',
        actions: ['action:not-bar'],
        metadata: {},
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        foo: {
          application,
          name: 'foo',
          actions: ['action:foo'],
          metadata: {},
        },
        space_bar: {
          application,
          name: 'space_bar',
          actions: ['action:bar'],
          metadata: {},
        },
        space_quz: {
          application,
          name: 'space_quz',
          actions: ['action:quz'],
          metadata: {},
        },
      }
    });
  }
});

registerPrivilegesWithClusterTest(`doesn't update privileges when order of actions differ`, {
  privilegeMap: {
    global: {
      foo: ['action:foo', 'action:quz']
    },
    space: {
      bar: ['action:bar']
    }
  },
  existingPrivileges: {
    [application]: {
      foo: {
        application,
        name: 'foo',
        actions: ['action:quz', 'action:foo'],
        metadata: {},
      },
      space_bar: {
        application,
        name: 'space_bar',
        actions: ['action:bar'],
        metadata: {},
      }
    }
  },
  assert: ({ expectDidntUpdatePrivileges }) => {
    expectDidntUpdatePrivileges();
  }
});

registerPrivilegesWithClusterTest(`throws and logs error when errors getting privileges`, {
  privilegeMap: {
    global: {},
    space: {}
  },
  throwErrorWhenGettingPrivileges: new Error('Error getting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error getting privileges');
  }
});

registerPrivilegesWithClusterTest(`throws and logs error when errors deleting privileges`, {
  privilegeMap: {
    global: {},
    space: {}
  },
  existingPrivileges: {
    [application]: {
      foo: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      }
    }
  },
  throwErrorWhenDeletingPrivileges: new Error('Error deleting privileges'),
  errorDeletingPrivilegeName: 'foo',
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error deleting privileges');
  }
});

registerPrivilegesWithClusterTest(`throws and logs error when errors putting privileges`, {
  privilegeMap: {
    global: {
      foo: []
    },
    space: {
      bar: []
    }
  },
  existingPrivileges: null,
  throwErrorWhenPuttingPrivileges: new Error('Error putting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error putting privileges');
  }
});

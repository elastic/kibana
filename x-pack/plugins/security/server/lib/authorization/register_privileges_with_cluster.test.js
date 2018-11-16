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

  const createMockServer = ({ privilegeMap }) => {
    const mockServer = {
      config: jest.fn().mockReturnValue({
        get: jest.fn(),
      }),
      log: jest.fn(),
      plugins: {
        security: {
          authorization: {
            actions: Symbol(),
            application,
            privileges: {
              get: () => privilegeMap
            }
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
    return (postPrivilegesBody) => {
      expect(error).toBeUndefined();
      expect(mockCallWithInternalUser).toHaveBeenCalledTimes(2);
      expect(mockCallWithInternalUser).toHaveBeenCalledWith('shield.getPrivilege', {
        privilege: application,
      });
      expect(mockCallWithInternalUser).toHaveBeenCalledWith(
        'shield.postPrivileges',
        {
          body: postPrivilegesBody,
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
    const mockServer = createMockServer({
      privilegeMap
    });
    const mockCallWithInternalUser = registerMockCallWithInternalUser()
      .mockImplementationOnce(async () => {
        if (throwErrorWhenGettingPrivileges) {
          throw throwErrorWhenGettingPrivileges;
        }

        // ES returns an empty object if we don't have any privileges
        if (!existingPrivileges) {
          return {};
        }

        return existingPrivileges;
      })
      .mockImplementationOnce(async () => {
        if (throwErrorWhenPuttingPrivileges) {
          throw throwErrorWhenPuttingPrivileges;
        }
      });

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

registerPrivilegesWithClusterTest(`inserts privileges when we don't have any existing privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:all']
    },
    space: {
      read: ['action:read']
    },
    features: {
      foo: {
        all: ['action:foo_all'],
      },
      bar: {
        read: ['action:bar_read'],
      }
    }
  },
  existingPrivileges: null,
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:all'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:read'],
          metadata: {},
        },
        feature_foo_all: {
          application,
          name: 'feature_foo_all',
          actions: ['action:foo_all'],
          metadata: {},
        },
        feature_bar_read: {
          application,
          name: 'feature_bar_read',
          actions: ['action:bar_read'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`throws error when we should be removing privilege`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar']
    }
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:not-foo'],
        metadata: {},
      },
      read: {
        application,
        name: 'read',
        actions: ['action:not-quz'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:not-bar'],
        metadata: {},
      }
    }
  },
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown(`Privileges are missing and can't be removed, currently.`);
  }
});

registerPrivilegesWithClusterTest(`updates privileges when global actions don't match`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:baz']
      },
      bar: {
        read: ['action:quz']
      }
    }
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:bar'],
        metadata: {},
      },
      feature_foo_all: {
        application,
        name: 'feature_foo_all',
        actions: ['action:baz'],
      },
      feature_bar_read: {
        application,
        name: 'feature_bar_read',
        actions: ['action:not-quz'],
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        feature_foo_all: {
          application,
          name: 'feature_foo_all',
          actions: ['action:baz'],
          metadata: {},
        },
        feature_bar_read: {
          application,
          name: 'feature_bar_read',
          actions: ['action:quz'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when space actions don't match`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:baz']
      },
      bar: {
        read: ['action:quz']
      }
    }
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:not-bar'],
        metadata: {},
      },
      feature_foo_all: {
        application,
        name: 'feature_foo_all',
        actions: ['action:baz'],
      },
      feature_bar_read: {
        application,
        name: 'feature_bar_read',
        actions: ['action:quz'],
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        feature_foo_all: {
          application,
          name: 'feature_foo_all',
          actions: ['action:baz'],
          metadata: {},
        },
        feature_bar_read: {
          application,
          name: 'feature_bar_read',
          actions: ['action:quz'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when feature actions don't match`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:baz']
      },
      bar: {
        read: ['action:quz']
      }
    }
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:bar'],
        metadata: {},
      },
      feature_foo_all: {
        application,
        name: 'feature_foo_all',
        actions: ['action:baz'],
      },
      feature_bar_read: {
        application,
        name: 'feature_bar_read',
        actions: ['action:not-quz'],
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        feature_foo_all: {
          application,
          name: 'feature_foo_all',
          actions: ['action:baz'],
          metadata: {},
        },
        feature_bar_read: {
          application,
          name: 'feature_bar_read',
          actions: ['action:quz'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when global privilege added`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
      read: ['action:quz']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:foo-all']
      }
    }
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:bar'],
        metadata: {},
      },
      feature_foo_all: {
        application,
        name: 'feature_foo_all',
        actions: ['action:foo-all'],
        metadata: {},
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        read: {
          application,
          name: 'read',
          actions: ['action:quz'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        feature_foo_all: {
          application,
          name: 'feature_foo_all',
          actions: ['action:foo-all'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when space privilege added`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
      read: ['action:quz']
    },
    features: {
      foo: {
        all: ['action:foo-all']
      }
    }
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:not-bar'],
        metadata: {},
      },
      feature_foo_all: {
        application,
        name: 'feature_foo_all',
        actions: ['action:foo-all'],
        metadata: {},
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_all: {
          application,
          name: 'space_all',
          actions: ['action:bar'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:quz'],
          metadata: {},
        },
        feature_foo_all: {
          application,
          name: 'feature_foo_all',
          actions: ['action:foo-all'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when feature privilege added`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
        read: ['action:foo-read']
      }
    }
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      space_all: {
        application,
        name: 'space_all',
        actions: ['action:not-bar'],
        metadata: {},
      },
      feature_foo_all: {
        application,
        name: 'feature_foo_all',
        actions: ['action:foo-all'],
        metadata: {},
      }
    }
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_all: {
          application,
          name: 'space_all',
          actions: ['action:bar'],
          metadata: {},
        },
        feature_foo_all: {
          application,
          name: 'feature_foo_all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        feature_foo_read: {
          application,
          name: 'feature_foo_read',
          actions: ['action:foo-read'],
          metadata: {},
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`doesn't update privileges when order of actions differ`, {
  privilegeMap: {
    global: {
      all: ['action:foo', 'action:quz']
    },
    space: {
      read: ['action:bar', 'action:quz']
    },
    features: {
      foo: {
        all: ['action:foo-all', 'action:bar-all']
      }
    }
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:quz', 'action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:quz', 'action:bar'],
        metadata: {},
      },
      feature_foo_all: {
        application,
        name: 'feature_foo_all',
        actions: ['action:bar-all', 'action:foo-all'],
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
    features: {},
    global: {},
    space: {}
  },
  throwErrorWhenGettingPrivileges: new Error('Error getting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error getting privileges');
  }
});

registerPrivilegesWithClusterTest(`throws and logs error when errors putting privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: []
    },
    space: {
      read: []
    }
  },
  existingPrivileges: null,
  throwErrorWhenPuttingPrivileges: new Error('Error putting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error putting privileges');
  }
});

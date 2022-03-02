/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import type { Logger } from 'src/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';

import type { RawKibanaPrivileges } from '../../common/model';
import { registerPrivilegesWithCluster } from './register_privileges_with_cluster';

const application = 'default-application';
const registerPrivilegesWithClusterTest = (
  description: string,
  {
    privilegeMap,
    existingPrivileges,
    throwErrorWhenGettingPrivileges,
    throwErrorWhenPuttingPrivileges,
    assert,
  }: {
    privilegeMap: RawKibanaPrivileges;
    existingPrivileges?: Record<string, Record<string, any>> | null;
    throwErrorWhenGettingPrivileges?: Error;
    throwErrorWhenPuttingPrivileges?: Error;
    assert: (arg: {
      expectUpdatedPrivileges: (postPrivilegesBody: any, deletedPrivileges?: string[]) => void;
      expectDidntUpdatePrivileges: () => void;
      expectErrorThrown: (expectedErrorMessage: string) => void;
    }) => void;
  }
) => {
  const createExpectUpdatedPrivileges = (
    mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
    mockLogger: jest.Mocked<Logger>,
    error: Error
  ) => {
    return (postPrivilegesBody: any, deletedPrivileges: string[] = []) => {
      expect(error).toBeUndefined();
      expect(mockClusterClient.asInternalUser.security.getPrivileges).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.asInternalUser.security.getPrivileges).toHaveBeenCalledWith({
        application,
      });

      expect(mockClusterClient.asInternalUser.security.putPrivileges).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.asInternalUser.security.putPrivileges).toHaveBeenCalledWith({
        body: postPrivilegesBody,
      });

      expect(mockClusterClient.asInternalUser.security.deletePrivileges).toHaveBeenCalledTimes(
        deletedPrivileges.length
      );
      for (const deletedPrivilege of deletedPrivileges) {
        expect(mockLogger.debug).toHaveBeenCalledWith(
          `Deleting Kibana Privilege ${deletedPrivilege} from Elasticsearch for ${application}`
        );
        expect(mockClusterClient.asInternalUser.security.deletePrivileges).toHaveBeenCalledWith({
          application,
          name: deletedPrivilege,
        });
      }

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Registering Kibana Privileges with Elasticsearch for ${application}`
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updated Kibana Privileges with Elasticsearch for ${application}`
      );
    };
  };

  const createExpectDidntUpdatePrivileges = (
    mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
    mockLogger: Logger,
    error: Error
  ) => {
    return () => {
      expect(error).toBeUndefined();
      expect(mockClusterClient.asInternalUser.security.getPrivileges).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.asInternalUser.security.getPrivileges).toHaveBeenLastCalledWith({
        application,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Registering Kibana Privileges with Elasticsearch for ${application}`
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Kibana Privileges already registered with Elasticsearch for ${application}`
      );
    };
  };

  const createExpectErrorThrown = (mockLogger: Logger, actualError: Error) => {
    return (expectedErrorMessage: string) => {
      expect(actualError).toBeDefined();
      expect(actualError).toBeInstanceOf(Error);
      expect(actualError.message).toEqual(expectedErrorMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error registering Kibana Privileges with Elasticsearch for ${application}: ${expectedErrorMessage}`
      );
    };
  };

  test(description, async () => {
    const mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockClusterClient.asInternalUser.security.getPrivileges.mockImplementation((async () => {
      if (throwErrorWhenGettingPrivileges) {
        throw throwErrorWhenGettingPrivileges;
      }

      // ES returns an empty object if we don't have any privileges
      if (!existingPrivileges) {
        return {};
      }

      return existingPrivileges;
    }) as any);
    mockClusterClient.asInternalUser.security.putPrivileges.mockImplementation((async () => {
      if (throwErrorWhenPuttingPrivileges) {
        throw throwErrorWhenPuttingPrivileges;
      }
    }) as any);

    const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

    let error;
    try {
      await registerPrivilegesWithCluster(
        mockLogger,
        { get: jest.fn().mockReturnValue(privilegeMap) },
        application,
        mockClusterClient
      );
    } catch (err) {
      error = err;
    }

    assert({
      expectUpdatedPrivileges: createExpectUpdatedPrivileges(mockClusterClient, mockLogger, error),
      expectDidntUpdatePrivileges: createExpectDidntUpdatePrivileges(
        mockClusterClient,
        mockLogger,
        error
      ),
      expectErrorThrown: createExpectErrorThrown(mockLogger, error),
    });
  });
};

registerPrivilegesWithClusterTest(`inserts privileges when we don't have any existing privileges`, {
  privilegeMap: {
    global: {
      all: ['action:all'],
    },
    space: {
      read: ['action:read'],
    },
    features: {
      foo: {
        all: ['action:foo_all'],
      },
      bar: {
        read: ['action:bar_read'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo_all'],
          metadata: {},
        },
        'feature_bar.read': {
          application,
          name: 'feature_bar.read',
          actions: ['action:bar_read'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`deletes no-longer specified privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    reserved: {},
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
      },
      space_baz: {
        application,
        name: 'space_baz',
        actions: ['action:not-baz'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges(
      {
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
        },
      },
      ['read', 'space_baz', 'reserved_customApplication']
    );
  },
});

registerPrivilegesWithClusterTest(`updates privileges when global actions don't match`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:baz'],
      },
      bar: {
        read: ['action:quz'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:baz'],
      },
      'feature_bar.read': {
        application,
        name: 'feature_bar.read',
        actions: ['action:not-quz'],
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:baz'],
          metadata: {},
        },
        'feature_bar.read': {
          application,
          name: 'feature_bar.read',
          actions: ['action:quz'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when space actions don't match`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:baz'],
      },
      bar: {
        read: ['action:quz'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:baz'],
      },
      'feature_bar.read': {
        application,
        name: 'feature_bar.read',
        actions: ['action:quz'],
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:baz'],
          metadata: {},
        },
        'feature_bar.read': {
          application,
          name: 'feature_bar.read',
          actions: ['action:quz'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when feature actions don't match`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:baz'],
      },
      bar: {
        read: ['action:quz'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:baz'],
      },
      'feature_bar.read': {
        application,
        name: 'feature_bar.read',
        actions: ['action:not-quz'],
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:baz'],
          metadata: {},
        },
        'feature_bar.read': {
          application,
          name: 'feature_bar.read',
          actions: ['action:quz'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when reserved actions don't match`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:baz'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:baz'],
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:not-customApplication'],
        metadata: {},
      },
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:baz'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when global privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
      read: ['action:quz'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:foo-all'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when space privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
      read: ['action:quz'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:foo-all'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when feature privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
        read: ['action:foo-read'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:foo-all'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        'feature_foo.read': {
          application,
          name: 'feature_foo.read',
          actions: ['action:foo-read'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when reserved privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
      },
    },
    reserved: {
      customApplication1: ['action:customApplication1'],
      customApplication2: ['action:customApplication2'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:foo-all'],
        metadata: {},
      },
      reserved_customApplication1: {
        application,
        name: 'reserved_customApplication1',
        actions: ['action:customApplication1'],
        metadata: {},
      },
    },
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
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        reserved_customApplication1: {
          application,
          name: 'reserved_customApplication1',
          actions: ['action:customApplication1'],
          metadata: {},
        },
        reserved_customApplication2: {
          application,
          name: 'reserved_customApplication2',
          actions: ['action:customApplication2'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`doesn't update privileges when order of actions differ`, {
  privilegeMap: {
    global: {
      all: ['action:foo', 'action:quz'],
    },
    space: {
      read: ['action:bar', 'action:quz'],
    },
    features: {
      foo: {
        all: ['action:foo-all', 'action:bar-all'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication1', 'action:customApplication2'],
    },
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
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:bar-all', 'action:foo-all'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication2', 'action:customApplication1'],
        metadata: {},
      },
    },
  },
  assert: ({ expectDidntUpdatePrivileges }) => {
    expectDidntUpdatePrivileges();
  },
});

registerPrivilegesWithClusterTest(`throws and logs error when errors getting privileges`, {
  privilegeMap: {
    features: {},
    global: {},
    space: {},
    reserved: {},
  },
  throwErrorWhenGettingPrivileges: new Error('Error getting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error getting privileges');
  },
});

registerPrivilegesWithClusterTest(`throws and logs error when errors putting privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: [],
    },
    space: {
      read: [],
    },
    reserved: {},
  },
  existingPrivileges: null,
  throwErrorWhenPuttingPrivileges: new Error('Error putting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error putting privileges');
  },
});

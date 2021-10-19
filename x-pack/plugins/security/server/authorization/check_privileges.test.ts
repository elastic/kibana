/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import { elasticsearchServiceMock, httpServerMock } from 'src/core/server/mocks';

import { GLOBAL_RESOURCE } from '../../common/constants';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import type { HasPrivilegesResponse } from './types';

const application = 'kibana-our_application';

const mockActions = {
  login: 'mock-action:login',
  version: 'mock-action:version',
};

const savedObjectTypes = ['foo-type', 'bar-type'];

const createMockClusterClient = (response: any) => {
  const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
    body: response,
  } as any);

  const mockClusterClient = elasticsearchServiceMock.createClusterClient();
  mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

  return { mockClusterClient, mockScopedClusterClient };
};

describe('#atSpace', () => {
  const checkPrivilegesAtSpaceTest = async (options: {
    spaceId: string;
    kibanaPrivileges?: string | string[];
    elasticsearchPrivileges?: {
      cluster: string[];
      index: Record<string, string[]>;
    };
    esHasPrivilegesResponse: HasPrivilegesResponse;
  }) => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient(
      options.esHasPrivilegesResponse
    );
    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
      mockActions,
      () => Promise.resolve(mockClusterClient),
      application
    );
    const request = httpServerMock.createKibanaRequest();
    const checkPrivileges = checkPrivilegesWithRequest(request);

    let actualResult;
    let errorThrown = null;
    try {
      actualResult = await checkPrivileges.atSpace(options.spaceId, {
        kibana: options.kibanaPrivileges,
        elasticsearch: options.elasticsearchPrivileges,
      });
    } catch (err) {
      errorThrown = err;
    }

    const expectedIndexPrivilegePayload = Object.entries(
      options.elasticsearchPrivileges?.index ?? {}
    ).map(([name, indexPrivileges]) => ({
      names: [name],
      privileges: indexPrivileges,
    }));

    expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        cluster: options.elasticsearchPrivileges?.cluster,
        index: expectedIndexPrivilegePayload,
        application: [
          {
            application,
            resources: [`space:${options.spaceId}`],
            privileges: options.kibanaPrivileges
              ? uniq([
                  mockActions.version,
                  mockActions.login,
                  ...(Array.isArray(options.kibanaPrivileges)
                    ? options.kibanaPrivileges
                    : [options.kibanaPrivileges]),
                ])
              : [mockActions.version, mockActions.login],
          },
        ],
      },
    });

    if (errorThrown) {
      return errorThrown;
    }
    return actualResult;
  };

  test('successful when checking for login and user has login', async () => {
    const result = await checkPrivilegesAtSpaceTest({
      spaceId: 'space_1',
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: true,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": true,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "mock-action:login",
              "resource": "space_1",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`failure when checking for login and user doesn't have login`, async () => {
    const result = await checkPrivilegesAtSpaceTest({
      spaceId: 'space_1',
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: false,
              [mockActions.version]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": false,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": false,
              "privilege": "mock-action:login",
              "resource": "space_1",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`throws error when checking for login and user has login but doesn't have version`, async () => {
    const result = await checkPrivilegesAtSpaceTest({
      spaceId: 'space_1',
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: false,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(
      `[Error: Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.]`
    );
  });

  test(`successful when checking for two actions and the user has both`, async () => {
    const result = await checkPrivilegesAtSpaceTest({
      spaceId: 'space_1',
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: true,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": true,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_1",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`failure when checking for two actions and the user has only one`, async () => {
    const result = await checkPrivilegesAtSpaceTest({
      spaceId: 'space_1',
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: false,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": false,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": false,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_1",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  describe('with a malformed Elasticsearch response', () => {
    test(`throws a validation error when an extra privilege is present in the response`, async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        kibanaPrivileges: [`saved_object:${savedObjectTypes[0]}/get`],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(
        `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected actions]`
      );
    });

    test(`throws a validation error when privileges are missing in the response`, async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        kibanaPrivileges: [`saved_object:${savedObjectTypes[0]}/get`],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(
        `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected actions]`
      );
    });
  });

  describe('with both Kibana and Elasticsearch privileges', () => {
    it('successful when checking for privileges, and user has all', async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: true,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": true,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_1",
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has only es privileges', async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: false,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": false,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_1",
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has only kibana privileges', async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: true,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
            },
          },
          cluster: {
            foo: false,
            bar: false,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": false,
                  "privilege": "foo",
                },
                Object {
                  "authorized": false,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": true,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_1",
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has none', async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: false,
              },
            },
          },
          cluster: {
            foo: false,
            bar: false,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": false,
                  "privilege": "foo",
                },
                Object {
                  "authorized": false,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": false,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_1",
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });
  });

  describe('with Elasticsearch privileges', () => {
    it('successful when checking for cluster privileges, and user has both', async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('successful when checking for index privileges, and user has both', async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        elasticsearchPrivileges: {
          cluster: [],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: true,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": true,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('successful when checking for a combination of index and cluster privileges', async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        elasticsearchPrivileges: {
          cluster: ['manage', 'monitor'],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            manage: true,
            monitor: true,
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: true,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "manage",
                },
                Object {
                  "authorized": true,
                  "privilege": "monitor",
                },
              ],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": true,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for a combination of index and cluster privileges, and some are missing', async () => {
      const result = await checkPrivilegesAtSpaceTest({
        spaceId: 'space_1',
        elasticsearchPrivileges: {
          cluster: ['manage', 'monitor'],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            manage: true,
            monitor: true,
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: false,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "manage",
                },
                Object {
                  "authorized": true,
                  "privilege": "monitor",
                },
              ],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": false,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });
  });

  test('omits login privilege when requireLoginAction: false', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: true,
      username: 'foo-username',
      index: {},
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.version]: true,
          },
        },
      },
    });
    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
      mockActions,
      () => Promise.resolve(mockClusterClient),
      application
    );
    const request = httpServerMock.createKibanaRequest();
    const checkPrivileges = checkPrivilegesWithRequest(request);
    await checkPrivileges.atSpace('space_1', {}, { requireLoginAction: false });

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        index: [],
        application: [
          {
            application,
            resources: [`space:space_1`],
            privileges: [mockActions.version],
          },
        ],
      },
    });
  });
});

describe('#atSpaces', () => {
  const checkPrivilegesAtSpacesTest = async (options: {
    spaceIds: string[];
    kibanaPrivileges?: string | string[];
    elasticsearchPrivileges?: {
      cluster: string[];
      index: Record<string, string[]>;
    };
    esHasPrivilegesResponse: HasPrivilegesResponse;
  }) => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient(
      options.esHasPrivilegesResponse
    );
    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
      mockActions,
      () => Promise.resolve(mockClusterClient),
      application
    );
    const request = httpServerMock.createKibanaRequest();
    const checkPrivileges = checkPrivilegesWithRequest(request);

    let actualResult;
    let errorThrown = null;
    try {
      actualResult = await checkPrivileges.atSpaces(options.spaceIds, {
        kibana: options.kibanaPrivileges,
        elasticsearch: options.elasticsearchPrivileges,
      });
    } catch (err) {
      errorThrown = err;
    }

    const expectedIndexPrivilegePayload = Object.entries(
      options.elasticsearchPrivileges?.index ?? {}
    ).map(([name, indexPrivileges]) => ({
      names: [name],
      privileges: indexPrivileges,
    }));

    expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        cluster: options.elasticsearchPrivileges?.cluster,
        index: expectedIndexPrivilegePayload,
        application: [
          {
            application,
            resources: options.spaceIds.map((spaceId) => `space:${spaceId}`),
            privileges: options.kibanaPrivileges
              ? uniq([
                  mockActions.version,
                  mockActions.login,
                  ...(Array.isArray(options.kibanaPrivileges)
                    ? options.kibanaPrivileges
                    : [options.kibanaPrivileges]),
                ])
              : [mockActions.version, mockActions.login],
          },
        ],
      },
    });

    if (errorThrown) {
      return errorThrown;
    }
    return actualResult;
  };

  test('successful when checking for login and user has login at both spaces', async () => {
    const result = await checkPrivilegesAtSpacesTest({
      spaceIds: ['space_1', 'space_2'],
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: true,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
            },
            'space:space_2': {
              [mockActions.login]: true,
              [mockActions.version]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": true,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "mock-action:login",
              "resource": "space_1",
            },
            Object {
              "authorized": true,
              "privilege": "mock-action:login",
              "resource": "space_2",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test('failure when checking for login and user has login at only one space', async () => {
    const result = await checkPrivilegesAtSpacesTest({
      spaceIds: ['space_1', 'space_2'],
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
            },
            'space:space_2': {
              [mockActions.login]: false,
              [mockActions.version]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": false,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "mock-action:login",
              "resource": "space_1",
            },
            Object {
              "authorized": false,
              "privilege": "mock-action:login",
              "resource": "space_2",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`throws error when checking for login and user has login but doesn't have version`, async () => {
    const result = await checkPrivilegesAtSpacesTest({
      spaceIds: ['space_1', 'space_2'],
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: false,
            },
            'space:space_2': {
              [mockActions.login]: true,
              [mockActions.version]: false,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(
      `[Error: Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.]`
    );
  });

  test(`throws error when Elasticsearch returns malformed response`, async () => {
    const result = await checkPrivilegesAtSpacesTest({
      spaceIds: ['space_1', 'space_2'],
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: true,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
            'space:space_2': {
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(
      `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected actions]`
    );
  });

  test(`successful when checking for two actions at two spaces and user has it all`, async () => {
    const result = await checkPrivilegesAtSpacesTest({
      spaceIds: ['space_1', 'space_2'],
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: true,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
            'space:space_2': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": true,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_2",
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_2",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`failure when checking for two actions at two spaces and user has one action at one space`, async () => {
    const result = await checkPrivilegesAtSpacesTest({
      spaceIds: ['space_1', 'space_2'],
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: false,
            },
            'space:space_2': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: false,
              [`saved_object:${savedObjectTypes[1]}/get`]: false,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": false,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": false,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": false,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_2",
            },
            Object {
              "authorized": false,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_2",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`failure when checking for two actions at two spaces and user has two actions at one space`, async () => {
    const result = await checkPrivilegesAtSpacesTest({
      spaceIds: ['space_1', 'space_2'],
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
            'space:space_2': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: false,
              [`saved_object:${savedObjectTypes[1]}/get`]: false,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": false,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": false,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_2",
            },
            Object {
              "authorized": false,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_2",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`failure when checking for two actions at two spaces and user has two actions at one space & one action at the other`, async () => {
    const result = await checkPrivilegesAtSpacesTest({
      spaceIds: ['space_1', 'space_2'],
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
            'space:space_2': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: false,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": false,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_1",
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:foo-type/get",
              "resource": "space_2",
            },
            Object {
              "authorized": false,
              "privilege": "saved_object:bar-type/get",
              "resource": "space_2",
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  describe('with a malformed Elasticsearch response', () => {
    test(`throws a validation error when an extra privilege is present in the response`, async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        kibanaPrivileges: [`saved_object:${savedObjectTypes[0]}/get`],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
              // @ts-expect-error this is wrong on purpose
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
              },
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(
        `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected resources]`
      );
    });

    test(`throws a validation error when privileges are missing in the response`, async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        kibanaPrivileges: [`saved_object:${savedObjectTypes[0]}/get`],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
              // @ts-expect-error this is wrong on purpose
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
              },
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(
        `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected resources]`
      );
    });

    test(`throws a validation error when an extra space is present in the response`, async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        kibanaPrivileges: [`saved_object:${savedObjectTypes[0]}/get`],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
              },
              'space:space_3': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
              },
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(
        `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected resources]`
      );
    });

    test(`throws a validation error when an a space is missing in the response`, async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        kibanaPrivileges: [`saved_object:${savedObjectTypes[0]}/get`],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
              },
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(
        `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected resources]`
      );
    });
  });

  describe('with both Kibana and Elasticsearch privileges', () => {
    it('successful when checking for privileges, and user has all', async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: true,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: true,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": true,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_2",
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_2",
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has only es privileges', async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: false,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: false,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": false,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_2",
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_2",
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has only kibana privileges', async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: true,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: true,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
            },
          },
          cluster: {
            foo: false,
            bar: false,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": false,
                  "privilege": "foo",
                },
                Object {
                  "authorized": false,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": true,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_2",
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_2",
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has none', async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: false,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: false,
              },
            },
          },
          cluster: {
            foo: false,
            bar: false,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": false,
                  "privilege": "foo",
                },
                Object {
                  "authorized": false,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": false,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_1",
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:foo-type/get",
                "resource": "space_2",
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:bar-type/get",
                "resource": "space_2",
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });
  });

  describe('with Elasticsearch privileges', () => {
    it('successful when checking for cluster privileges, and user has both', async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('successful when checking for index privileges, and user has both', async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        elasticsearchPrivileges: {
          cluster: [],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: true,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": true,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('successful when checking for a combination of index and cluster privileges', async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        elasticsearchPrivileges: {
          cluster: ['manage', 'monitor'],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            manage: true,
            monitor: true,
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: true,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "manage",
                },
                Object {
                  "authorized": true,
                  "privilege": "monitor",
                },
              ],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": true,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for a combination of index and cluster privileges, and some are missing', async () => {
      const result = await checkPrivilegesAtSpacesTest({
        spaceIds: ['space_1', 'space_2'],
        elasticsearchPrivileges: {
          cluster: ['manage', 'monitor'],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              'space:space_1': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
              'space:space_2': {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            manage: true,
            monitor: true,
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: false,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "manage",
                },
                Object {
                  "authorized": true,
                  "privilege": "monitor",
                },
              ],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": false,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });
  });

  test('omits login privilege when requireLoginAction: false', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: true,
      username: 'foo-username',
      index: {},
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.version]: true,
          },
        },
      },
    });
    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
      mockActions,
      () => Promise.resolve(mockClusterClient),
      application
    );
    const request = httpServerMock.createKibanaRequest();
    const checkPrivileges = checkPrivilegesWithRequest(request);
    await checkPrivileges.atSpaces(['space_1'], {}, { requireLoginAction: false });

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        index: [],
        application: [
          {
            application,
            resources: [`space:space_1`],
            privileges: [mockActions.version],
          },
        ],
      },
    });
  });
});

describe('#globally', () => {
  const checkPrivilegesGloballyTest = async (options: {
    kibanaPrivileges?: string | string[];
    elasticsearchPrivileges?: {
      cluster: string[];
      index: Record<string, string[]>;
    };
    esHasPrivilegesResponse: HasPrivilegesResponse;
  }) => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient(
      options.esHasPrivilegesResponse
    );
    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
      mockActions,
      () => Promise.resolve(mockClusterClient),
      application
    );
    const request = httpServerMock.createKibanaRequest();
    const checkPrivileges = checkPrivilegesWithRequest(request);

    let actualResult;
    let errorThrown = null;
    try {
      actualResult = await checkPrivileges.globally({
        kibana: options.kibanaPrivileges,
        elasticsearch: options.elasticsearchPrivileges,
      });
    } catch (err) {
      errorThrown = err;
    }

    const expectedIndexPrivilegePayload = Object.entries(
      options.elasticsearchPrivileges?.index ?? {}
    ).map(([name, indexPrivileges]) => ({
      names: [name],
      privileges: indexPrivileges,
    }));

    expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        cluster: options.elasticsearchPrivileges?.cluster,
        index: expectedIndexPrivilegePayload,
        application: [
          {
            application,
            resources: [GLOBAL_RESOURCE],
            privileges: options.kibanaPrivileges
              ? uniq([
                  mockActions.version,
                  mockActions.login,
                  ...(Array.isArray(options.kibanaPrivileges)
                    ? options.kibanaPrivileges
                    : [options.kibanaPrivileges]),
                ])
              : [mockActions.version, mockActions.login],
          },
        ],
      },
    });

    if (errorThrown) {
      return errorThrown;
    }
    return actualResult;
  };

  test('successful when checking for login and user has login', async () => {
    const result = await checkPrivilegesGloballyTest({
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: true,
        username: 'foo-username',
        application: {
          [application]: {
            [GLOBAL_RESOURCE]: {
              [mockActions.login]: true,
              [mockActions.version]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": true,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "mock-action:login",
              "resource": undefined,
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`failure when checking for login and user doesn't have login`, async () => {
    const result = await checkPrivilegesGloballyTest({
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            [GLOBAL_RESOURCE]: {
              [mockActions.login]: false,
              [mockActions.version]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": false,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": false,
              "privilege": "mock-action:login",
              "resource": undefined,
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`throws error when checking for login and user has login but doesn't have version`, async () => {
    const result = await checkPrivilegesGloballyTest({
      kibanaPrivileges: mockActions.login,
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            [GLOBAL_RESOURCE]: {
              [mockActions.login]: true,
              [mockActions.version]: false,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(
      `[Error: Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.]`
    );
  });

  test(`throws error when Elasticsearch returns malformed response`, async () => {
    const result = await checkPrivilegesGloballyTest({
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            [GLOBAL_RESOURCE]: {
              [`saved_object:${savedObjectTypes[0]}/get`]: false,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(
      `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected actions]`
    );
  });

  test(`successful when checking for two actions and the user has both`, async () => {
    const result = await checkPrivilegesGloballyTest({
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: true,
        username: 'foo-username',
        application: {
          [application]: {
            [GLOBAL_RESOURCE]: {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: true,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": true,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": true,
              "privilege": "saved_object:foo-type/get",
              "resource": undefined,
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:bar-type/get",
              "resource": undefined,
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  test(`failure when checking for two actions and the user has only one`, async () => {
    const result = await checkPrivilegesGloballyTest({
      kibanaPrivileges: [
        `saved_object:${savedObjectTypes[0]}/get`,
        `saved_object:${savedObjectTypes[1]}/get`,
      ],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            [GLOBAL_RESOURCE]: {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`saved_object:${savedObjectTypes[0]}/get`]: false,
              [`saved_object:${savedObjectTypes[1]}/get`]: true,
            },
          },
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hasAllRequested": false,
        "privileges": Object {
          "elasticsearch": Object {
            "cluster": Array [],
            "index": Object {},
          },
          "kibana": Array [
            Object {
              "authorized": false,
              "privilege": "saved_object:foo-type/get",
              "resource": undefined,
            },
            Object {
              "authorized": true,
              "privilege": "saved_object:bar-type/get",
              "resource": undefined,
            },
          ],
        },
        "username": "foo-username",
      }
    `);
  });

  describe('with a malformed Elasticsearch response', () => {
    test(`throws a validation error when an extra privilege is present in the response`, async () => {
      const result = await checkPrivilegesGloballyTest({
        kibanaPrivileges: [`saved_object:${savedObjectTypes[0]}/get`],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(
        `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected actions]`
      );
    });

    test(`throws a validation error when privileges are missing in the response`, async () => {
      const result = await checkPrivilegesGloballyTest({
        kibanaPrivileges: [`saved_object:${savedObjectTypes[0]}/get`],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(
        `[Error: Invalid response received from Elasticsearch has_privilege endpoint. Error: [application.kibana-our_application]: Payload did not match expected actions]`
      );
    });
  });

  describe('with both Kibana and Elasticsearch privileges', () => {
    it('successful when checking for privileges, and user has all', async () => {
      const result = await checkPrivilegesGloballyTest({
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: true,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": true,
                "privilege": "saved_object:foo-type/get",
                "resource": undefined,
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:bar-type/get",
                "resource": undefined,
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has only es privileges', async () => {
      const result = await checkPrivilegesGloballyTest({
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: false,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": false,
                "privilege": "saved_object:foo-type/get",
                "resource": undefined,
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:bar-type/get",
                "resource": undefined,
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has only kibana privileges', async () => {
      const result = await checkPrivilegesGloballyTest({
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: true,
                [`saved_object:${savedObjectTypes[1]}/get`]: true,
              },
            },
          },
          cluster: {
            foo: false,
            bar: false,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": false,
                  "privilege": "foo",
                },
                Object {
                  "authorized": false,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": true,
                "privilege": "saved_object:foo-type/get",
                "resource": undefined,
              },
              Object {
                "authorized": true,
                "privilege": "saved_object:bar-type/get",
                "resource": undefined,
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for privileges, and user has none', async () => {
      const result = await checkPrivilegesGloballyTest({
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        kibanaPrivileges: [
          `saved_object:${savedObjectTypes[0]}/get`,
          `saved_object:${savedObjectTypes[1]}/get`,
        ],
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
                [`saved_object:${savedObjectTypes[0]}/get`]: false,
                [`saved_object:${savedObjectTypes[1]}/get`]: false,
              },
            },
          },
          cluster: {
            foo: false,
            bar: false,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": false,
                  "privilege": "foo",
                },
                Object {
                  "authorized": false,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [
              Object {
                "authorized": false,
                "privilege": "saved_object:foo-type/get",
                "resource": undefined,
              },
              Object {
                "authorized": false,
                "privilege": "saved_object:bar-type/get",
                "resource": undefined,
              },
            ],
          },
          "username": "foo-username",
        }
      `);
    });
  });

  describe('with Elasticsearch privileges', () => {
    it('successful when checking for cluster privileges, and user has both', async () => {
      const result = await checkPrivilegesGloballyTest({
        elasticsearchPrivileges: {
          cluster: ['foo', 'bar'],
          index: {},
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            foo: true,
            bar: true,
          },
          index: {},
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "foo",
                },
                Object {
                  "authorized": true,
                  "privilege": "bar",
                },
              ],
              "index": Object {},
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('successful when checking for index privileges, and user has both', async () => {
      const result = await checkPrivilegesGloballyTest({
        elasticsearchPrivileges: {
          cluster: [],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: true,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": true,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('successful when checking for a combination of index and cluster privileges', async () => {
      const result = await checkPrivilegesGloballyTest({
        elasticsearchPrivileges: {
          cluster: ['manage', 'monitor'],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: true,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            manage: true,
            monitor: true,
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: true,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": true,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "manage",
                },
                Object {
                  "authorized": true,
                  "privilege": "monitor",
                },
              ],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": true,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });

    it('failure when checking for a combination of index and cluster privileges, and some are missing', async () => {
      const result = await checkPrivilegesGloballyTest({
        elasticsearchPrivileges: {
          cluster: ['manage', 'monitor'],
          index: {
            foo: ['all'],
            bar: ['read', 'view_index_metadata'],
          },
        },
        esHasPrivilegesResponse: {
          has_all_requested: false,
          username: 'foo-username',
          application: {
            [application]: {
              [GLOBAL_RESOURCE]: {
                [mockActions.login]: true,
                [mockActions.version]: true,
              },
            },
          },
          cluster: {
            manage: true,
            monitor: true,
          },
          index: {
            foo: {
              all: true,
            },
            bar: {
              read: true,
              view_index_metadata: false,
            },
          },
        },
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hasAllRequested": false,
          "privileges": Object {
            "elasticsearch": Object {
              "cluster": Array [
                Object {
                  "authorized": true,
                  "privilege": "manage",
                },
                Object {
                  "authorized": true,
                  "privilege": "monitor",
                },
              ],
              "index": Object {
                "bar": Array [
                  Object {
                    "authorized": true,
                    "privilege": "read",
                  },
                  Object {
                    "authorized": false,
                    "privilege": "view_index_metadata",
                  },
                ],
                "foo": Array [
                  Object {
                    "authorized": true,
                    "privilege": "all",
                  },
                ],
              },
            },
            "kibana": Array [],
          },
          "username": "foo-username",
        }
      `);
    });
  });

  test('omits login privilege when requireLoginAction: false', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: true,
      username: 'foo-username',
      index: {},
      application: {
        [application]: {
          [GLOBAL_RESOURCE]: {
            [mockActions.version]: true,
          },
        },
      },
    });
    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
      mockActions,
      () => Promise.resolve(mockClusterClient),
      application
    );
    const request = httpServerMock.createKibanaRequest();
    const checkPrivileges = checkPrivilegesWithRequest(request);
    await checkPrivileges.globally({}, { requireLoginAction: false });

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        index: [],
        application: [
          {
            application,
            resources: [GLOBAL_RESOURCE],
            privileges: [mockActions.version],
          },
        ],
      },
    });
  });
});

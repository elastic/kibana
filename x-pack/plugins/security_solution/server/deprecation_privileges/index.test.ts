/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DeprecationsServiceSetup,
  GetDeprecationsContext,
  RegisterDeprecationsConfig,
} from 'src/core/server';
import { loggingSystemMock } from 'src/core/server/mocks';

import { registerPrivilegeDeprecations, updateSecuritySolutionPrivileges } from '.';

describe('deprecations', () => {
  describe('create cases privileges from siem privileges without cases sub-feature', () => {
    test('should be empty if siem privileges is an empty array', () => {
      expect(updateSecuritySolutionPrivileges([])).toMatchInlineSnapshot(`Object {}`);
    });

    test('creates cases privilege ["all"] when siem privilege is ["all"]', () => {
      expect(updateSecuritySolutionPrivileges(['all'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["all", "read"]', () => {
      expect(updateSecuritySolutionPrivileges(['all', 'read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
            "read",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["read", "all"]', () => {
      expect(updateSecuritySolutionPrivileges(['read', 'all'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "read",
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["read"]', () => {
      expect(updateSecuritySolutionPrivileges(['read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "read",
          ],
        }
      `);
    });
  });

  describe('create cases privileges from siem privileges with cases sub-feature', () => {
    test('No cases privilege when siem privilege is ["minimal_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all'])).toMatchInlineSnapshot(`
        Object {
          "siem": Array [
            "minimal_all",
          ],
        }
      `);
    });

    test('No cases privilege when siem privilege is ["minimal_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read'])).toMatchInlineSnapshot(`
        Object {
          "siem": Array [
            "minimal_read",
          ],
        }
      `);
    });

    test('No cases privilege when siem privilege is ["minimal_read", "minimal_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'minimal_all']))
        .toMatchInlineSnapshot(`
        Object {
          "siem": Array [
            "minimal_read",
            "minimal_all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["minimal_all", "all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'all'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "minimal_all",
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["all", "minimal_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['all', 'minimal_read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
            "minimal_read",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["minimal_all", "cases_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'cases_all'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "minimal_all",
            "cases_all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is [minimal_all, cases_read, cases_all]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'cases_read', 'cases_all']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "minimal_all",
            "cases_read",
            "cases_all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is [minimal_all, cases_all, cases_read]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'cases_all', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "minimal_all",
            "cases_all",
            "cases_read",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["all", "cases_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['all', 'cases_read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
            "cases_read",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["minimal_all", "read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "minimal_all",
            "read",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["read", "minimal_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['read', 'minimal_read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "read",
            "minimal_read",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["minimal_all", "cases_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "minimal_all",
            "cases_read",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["minimal_all", "read", "cases_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'read', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "minimal_all",
            "read",
            "cases_read",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["minimal_read", "cases_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "minimal_read",
            "cases_read",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["minimal_read", "cases_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'cases_all']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "minimal_read",
            "cases_all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is [minimal_read, cases_read, cases_all]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'cases_read', 'cases_all']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "minimal_read",
            "cases_read",
            "cases_all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is [minimal_read, cases_all, cases_read]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'cases_all', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "minimal_read",
            "cases_all",
            "cases_read",
          ],
        }
      `);
    });
  });

  describe('registerPrivilegeDeprecations', () => {
    const mockContext = {
      esClient: jest.fn(),
      savedObjectsClient: jest.fn(),
    } as unknown as GetDeprecationsContext;
    const getDeprecations = jest.fn();
    const getKibanaRolesByFeatureId = jest.fn();
    const mockDeprecationsService: DeprecationsServiceSetup = {
      registerDeprecations: (deprecationContext: RegisterDeprecationsConfig) => {
        getDeprecations.mockImplementation(deprecationContext.getDeprecations);
      },
    };

    beforeAll(() => {
      registerPrivilegeDeprecations({
        deprecationsService: mockDeprecationsService,
        getKibanaRolesByFeatureId,
        logger: loggingSystemMock.createLogger(),
      });
    });
    beforeEach(() => {
      getKibanaRolesByFeatureId.mockReset();
    });

    test('getDeprecations return the errors from getKibanaRolesByFeatureId', async () => {
      const errorResponse = {
        errors: [
          {
            correctiveActions: {
              manualSteps: [
                "A user with the 'manage_security' cluster privilege is required to perform this check.",
              ],
            },
            level: 'fetch_error',
            message: 'Error retrieving roles for privilege deprecations: Test error',
            title: 'Error in privilege deprecations services',
          },
        ],
      };
      getKibanaRolesByFeatureId.mockResolvedValue(errorResponse);
      const response = await getDeprecations(mockContext);
      expect(response).toEqual(errorResponse.errors);
    });

    test('getDeprecations return empty array when securitySolutionCases privileges are already set up', async () => {
      getKibanaRolesByFeatureId.mockResolvedValue({
        roles: [
          {
            _transform_error: [],
            _unrecognized_applications: [],
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [
              {
                base: [],
                feature: {
                  bar: ['bar-privilege-1'],
                  securitySolutionCases: ['read'],
                  siem: ['minimal_read', 'cases_read'],
                },
                spaces: ['securitySolutions'],
              },
            ],
            metadata: {
              _reserved: true,
            },
            name: 'first_role',
            transient_metadata: {
              enabled: true,
            },
          },
        ],
      });
      const response = await getDeprecations(mockContext);
      expect(response).toMatchInlineSnapshot(`Array []`);
    });

    test('happy path build securitySolutionCases privileges from  siem privileges', async () => {
      getKibanaRolesByFeatureId.mockResolvedValue({
        roles: [
          {
            _transform_error: [],
            _unrecognized_applications: [],
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [
              {
                base: [],
                feature: {
                  bar: ['bar-privilege-1'],
                  siem: ['minimal_all', 'cases_read'],
                },
                spaces: ['securitySolutions'],
              },
            ],
            metadata: {
              _reserved: true,
            },
            name: 'first_role',
            transient_metadata: {
              enabled: true,
            },
          },
        ],
      });
      const response = await getDeprecations(mockContext);
      expect(response).toMatchInlineSnapshot(`
        Array [
          Object {
            "correctiveActions": Object {
              "api": Object {
                "body": Object {
                  "elasticsearch": Object {
                    "cluster": Array [],
                    "indices": Array [],
                    "run_as": Array [],
                  },
                  "kibana": Array [
                    Object {
                      "base": Array [],
                      "feature": Object {
                        "bar": Array [
                          "bar-privilege-1",
                        ],
                        "securitySolutionCases": Array [
                          "read",
                        ],
                        "siem": Array [
                          "minimal_all",
                          "cases_read",
                        ],
                      },
                      "spaces": Array [
                        "securitySolutions",
                      ],
                    },
                  ],
                  "metadata": Object {
                    "_reserved": true,
                  },
                },
                "method": "PUT",
                "omitContextFromBody": true,
                "path": "/api/security/role/first_role",
              },
              "manualSteps": Array [],
            },
            "deprecationType": "feature",
            "level": "warning",
            "message": "The \\"Security\\" feature will be split into two separate features in 8.0. The \\"first_role\\" role grants access to this feature, and it needs to be updated before you upgrade Kibana. This will ensure that users have access to the same features after the upgrade.",
            "title": "The \\"first_role\\" role needs to be updated",
          },
        ]
      `);
    });
  });
});

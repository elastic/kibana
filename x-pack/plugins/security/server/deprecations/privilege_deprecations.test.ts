/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDeprecationsContext } from 'src/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';

import { getPrivilegeDeprecationsService } from '.';
import { licenseMock } from '../../common/licensing/index.mock';

const kibanaIndexName = '.a-kibana-index';
const application = `kibana-${kibanaIndexName}`;

describe('#getPrivilegeDeprecationsService', () => {
  describe('#getKibanaRolesByFeatureId', () => {
    const mockAsCurrentUser = elasticsearchServiceMock.createScopedClusterClient();
    const mockGetFeatures = jest.fn().mockResolvedValue([]);
    const mockLicense = licenseMock.create();
    const mockLogger = loggingSystemMock.createLogger();
    const authz = { applicationName: application };

    const { getKibanaRolesByFeatureId } = getPrivilegeDeprecationsService({
      authz,
      getFeatures: mockGetFeatures,
      license: mockLicense,
      logger: mockLogger,
    });

    it('happy path to find siem roles with feature_siem privileges', async () => {
      mockAsCurrentUser.asCurrentUser.security.getRole.mockResponse({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['feature_siem.all', 'feature_siem.cases_read'],
              resources: ['space:securitySolutions'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      });

      const mockContext = {
        esClient: mockAsCurrentUser,
        savedObjectsClient: jest.fn(),
      } as unknown as GetDeprecationsContext;

      const resp = await getKibanaRolesByFeatureId({ context: mockContext, featureId: 'siem' });
      expect(resp).toMatchInlineSnapshot(`
        Object {
          "roles": Array [
            Object {
              "_transform_error": Array [],
              "_unrecognized_applications": Array [],
              "elasticsearch": Object {
                "cluster": Array [],
                "indices": Array [],
                "run_as": Array [],
              },
              "kibana": Array [
                Object {
                  "base": Array [],
                  "feature": Object {
                    "siem": Array [
                      "all",
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
              "name": "first_role",
              "transient_metadata": Object {
                "enabled": true,
              },
            },
          ],
        }
      `);
    });

    it('happy path to find siem roles with feature_siem and feature_foo and feature_bar privileges', async () => {
      mockAsCurrentUser.asCurrentUser.security.getRole.mockResponse({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: [
                'feature_foo.foo-privilege-1',
                'feature_foo.foo-privilege-2',
                'feature_bar.bar-privilege-1',
                'feature_siem.all',
                'feature_siem.cases_read',
              ],
              resources: ['space:securitySolutions'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      });

      const mockContext = {
        esClient: mockAsCurrentUser,
        savedObjectsClient: jest.fn(),
      } as unknown as GetDeprecationsContext;

      const resp = await getKibanaRolesByFeatureId({ context: mockContext, featureId: 'siem' });
      expect(resp).toMatchInlineSnapshot(`
        Object {
          "roles": Array [
            Object {
              "_transform_error": Array [],
              "_unrecognized_applications": Array [],
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
                    "foo": Array [
                      "foo-privilege-1",
                      "foo-privilege-2",
                    ],
                    "siem": Array [
                      "all",
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
              "name": "first_role",
              "transient_metadata": Object {
                "enabled": true,
              },
            },
          ],
        }
      `);
    });

    it('happy path to NOT find siem roles with and feature_foo and feature_bar privileges', async () => {
      mockAsCurrentUser.asCurrentUser.security.getRole.mockResponse({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: [
                'feature_foo.foo-privilege-1',
                'feature_foo.foo-privilege-2',
                'feature_bar.bar-privilege-1',
              ],
              resources: ['space:securitySolutions'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      });

      const mockContext = {
        esClient: mockAsCurrentUser,
        savedObjectsClient: jest.fn(),
      } as unknown as GetDeprecationsContext;

      const resp = await getKibanaRolesByFeatureId({ context: mockContext, featureId: 'siem' });
      expect(resp).toMatchInlineSnapshot(`
        Object {
          "roles": Array [],
        }
      `);
    });

    it('unhappy path with status code 400, we should have the attribute errors', async () => {
      mockAsCurrentUser.asCurrentUser.security.getRole.mockResolvedValue(
        elasticsearchServiceMock.createErrorTransportRequestPromise({
          message: 'Test error',
          statusCode: 400,
        })
      );

      const mockContext = {
        esClient: mockAsCurrentUser,
        savedObjectsClient: jest.fn(),
      } as unknown as GetDeprecationsContext;

      const resp = await getKibanaRolesByFeatureId({ context: mockContext, featureId: 'siem' });
      expect(resp).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "A user with the \\"manage_security\\" cluster privilege is required to perform this check.",
                ],
              },
              "level": "fetch_error",
              "message": "Error retrieving roles for privilege deprecations: Test error",
              "title": "Error in privilege deprecations services",
            },
          ],
        }
      `);
    });

    it('unhappy path with status code 403, we should have unauthorized message in the attribute errors', async () => {
      mockAsCurrentUser.asCurrentUser.security.getRole.mockResolvedValue(
        elasticsearchServiceMock.createErrorTransportRequestPromise({
          message: 'Test error',
          statusCode: 403,
        })
      );

      const mockContext = {
        esClient: mockAsCurrentUser,
        savedObjectsClient: jest.fn(),
      } as unknown as GetDeprecationsContext;

      const resp = await getKibanaRolesByFeatureId({ context: mockContext, featureId: 'siem' });
      expect(resp).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "A user with the \\"manage_security\\" cluster privilege is required to perform this check.",
                ],
              },
              "level": "fetch_error",
              "message": "You must have the 'manage_security' cluster privilege to fix role deprecations.",
              "title": "Error in privilege deprecations services",
            },
          ],
        }
      `);
    });
  });
});

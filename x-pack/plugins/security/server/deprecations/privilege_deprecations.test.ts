/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDeprecationsContext } from 'src/core/server';

import { getPrivilegeDeprecationsServices } from '.';
import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../../src/core/server/mocks';
import { featuresPluginMock } from '../../../features/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { AuthorizationService } from '../authorization';

const kibanaIndexName = '.a-kibana-index';
const application = `kibana-${kibanaIndexName}`;

describe('#getPrivilegeDeprecationsServices', () => {
  describe('#getKibanaRolesByFeatureId', () => {
    const mockClusterClient = elasticsearchServiceMock.createClusterClient();
    const mockAsCurrentUser = elasticsearchServiceMock.createScopedClusterClient();

    const mockGetSpacesService = jest
      .fn()
      .mockReturnValue({ getSpaceId: jest.fn(), namespaceToSpaceId: jest.fn() });
    const mockFeaturesSetup = featuresPluginMock.createSetup();
    const mockLicense = licenseMock.create();
    const mockCoreSetup = coreMock.createSetup();

    const authorizationService = new AuthorizationService();
    const getClusterClient = () => Promise.resolve(mockClusterClient);
    const authz = authorizationService.setup({
      http: mockCoreSetup.http,
      capabilities: mockCoreSetup.capabilities,
      getClusterClient,
      license: mockLicense,
      loggers: loggingSystemMock.create(),
      kibanaIndexName,
      packageVersion: 'some-version',
      buildNumber: 42,
      features: mockFeaturesSetup,
      getSpacesService: mockGetSpacesService,
      getCurrentUser: jest.fn(),
    });

    const { getKibanaRolesByFeatureId } = getPrivilegeDeprecationsServices(authz, mockLicense);

    it('happy path, we should have the attribute roles', async () => {
      const apiResponse = async () => ({
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

      mockAsCurrentUser.asCurrentUser.security.getRole.mockImplementation((async () => ({
        body: await apiResponse(),
      })) as any);

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

    it('unhappy path, we should have the attribute errros', async () => {
      const apiResponse = async () => {
        throw new Error('It happens');
      };

      mockAsCurrentUser.asCurrentUser.security.getRole.mockImplementation((async () => ({
        body: await apiResponse(),
      })) as any);

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
              "message": "Error retrieving roles for privilege deprecations: It happens",
              "title": "Error in privilege deprecations services",
            },
          ],
        }
      `);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { runPrivilegeTests } from '../../privileges_helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const READ_SCENARIOS = [
    {
      user: testUsers.fleet_all_only,
      statusCode: 200,
    },
    {
      user: testUsers.fleet_read_only,
      statusCode: 200,
    },
    {
      user: testUsers.fleet_agent_policies_read_only,
      statusCode: 200,
    },
    {
      user: testUsers.fleet_agent_policies_all_only,
      statusCode: 200,
    },
    {
      // Expect minimal access
      user: testUsers.fleet_agents_read_only,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_no_access,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_minimal_all_only,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_minimal_read_only,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_settings_read_only,
      statusCode: 403,
    },
  ];

  const ALL_SCENARIOS = [
    {
      user: testUsers.fleet_all_only,
      statusCode: 200,
    },
    {
      user: testUsers.fleet_agent_policies_all_only,
      statusCode: 200,
    },
    {
      user: testUsers.fleet_read_only,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_agent_policies_read_only,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_agents_read_only,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_no_access,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_minimal_all_only,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_minimal_read_only,
      statusCode: 403,
    },
    {
      user: testUsers.fleet_settings_read_only,
      statusCode: 403,
    },
  ];

  const ROUTES = [
    {
      method: 'GET',
      path: '/api/fleet/cloud_connectors',
      scenarios: READ_SCENARIOS,
    },
    // Generate unique POST routes for each scenario to avoid duplicate name validation errors
    ...ALL_SCENARIOS.map((scenario, index) => ({
      method: 'POST',
      path: '/api/fleet/cloud_connectors',
      scenarios: [scenario],
      send: {
        name: `test-cloud-connector-${scenario.user.username}-${index}-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        cloudProvider: 'aws',
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
          external_id: {
            type: 'password',
            value: {
              id: 'test1234567890123456',
              isSecretRef: true,
            },
          },
        },
      },
    })),
  ];

  describe('Cloud Connector Privileges', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await setupTestUsers(getService('security'));

      // Create a test connector for GET tests to work with
      await supertest
        .post(`/api/fleet/cloud_connectors`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `test-cloud-connector-privileges-${Date.now()}`,
          cloudProvider: 'aws',
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
            external_id: {
              type: 'password',
              value: {
                id: 'test1234567890123456',
                isSecretRef: true,
              },
            },
          },
        })
        .expect(200);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}

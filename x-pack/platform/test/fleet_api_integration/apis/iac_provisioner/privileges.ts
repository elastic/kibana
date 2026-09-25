/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { runPrivilegeTests } from '../../privileges_helpers';
import { setupTestUsers, testUsers } from '../test_users';
import {
  INTERNAL_ROUTE_HEADERS,
  RENDER_TEMPLATE_PATH,
  TEST_PACKAGE_INTEGRATION_SET,
  createAwsCloudConnector,
  verifyIacKeyPath,
} from './helpers/fixtures';
import { createMockIacProvisioner } from './helpers/mock_iac_provisioner_api';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const mockIacProvisioner = createMockIacProvisioner();

  let cloudConnectorId: string;

  // Render is read + proxy: AGENT_POLICIES.READ | INTEGRATIONS.READ, like GET cloud connectors.
  const READ_SCENARIOS = [
    { user: testUsers.fleet_all_only, statusCode: 200 },
    { user: testUsers.fleet_read_only, statusCode: 200 },
    { user: testUsers.fleet_agent_policies_read_only, statusCode: 200 },
    { user: testUsers.fleet_agent_policies_all_only, statusCode: 200 },
    { user: testUsers.fleet_agents_read_only, statusCode: 403 },
    { user: testUsers.fleet_no_access, statusCode: 403 },
    { user: testUsers.fleet_minimal_all_only, statusCode: 403 },
    { user: testUsers.fleet_minimal_read_only, statusCode: 403 },
    { user: testUsers.fleet_settings_read_only, statusCode: 403 },
  ];

  // Verify stores the derived upgrade status, so it needs the connector update privileges.
  const ALL_SCENARIOS = [
    { user: testUsers.fleet_all_only, statusCode: 200 },
    { user: testUsers.fleet_agent_policies_all_only, statusCode: 200 },
    { user: testUsers.fleet_read_only, statusCode: 403 },
    { user: testUsers.fleet_agent_policies_read_only, statusCode: 403 },
    { user: testUsers.fleet_agents_read_only, statusCode: 403 },
    { user: testUsers.fleet_no_access, statusCode: 403 },
    { user: testUsers.fleet_minimal_all_only, statusCode: 403 },
    { user: testUsers.fleet_minimal_read_only, statusCode: 403 },
    { user: testUsers.fleet_settings_read_only, statusCode: 403 },
  ];

  const ROUTES = [
    {
      method: 'POST',
      path: RENDER_TEMPLATE_PATH,
      headers: INTERNAL_ROUTE_HEADERS,
      scenarios: READ_SCENARIOS,
      send: {
        provider: 'aws',
        workflow: 'federated_identity',
        flow: 'cloud_connector',
        integrations: TEST_PACKAGE_INTEGRATION_SET,
      },
    },
    {
      method: 'POST',
      path: () => verifyIacKeyPath(cloudConnectorId),
      headers: INTERNAL_ROUTE_HEADERS,
      scenarios: ALL_SCENARIOS,
      // A read of the integration set: no provisioner call, no stored status.
      send: { compare: false },
    },
  ];

  describe('IaC Provisioner Privileges', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
      await setupTestUsers(getService('security'));
      await mockIacProvisioner.start();
      cloudConnectorId = await createAwsCloudConnector(supertest);
    });

    after(async () => {
      await mockIacProvisioner.stop();
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}

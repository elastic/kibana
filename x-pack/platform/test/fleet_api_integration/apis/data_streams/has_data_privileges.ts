/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { runPrivilegeTests } from '../../privileges_helpers';
import { setupTestUsers, testUsers } from '../test_users';

// GET /api/fleet/data_streams/data requires FLEET_API_PRIVILEGES.FLEET.READ (fleetv2 `read`),
// which is granted by the top-level Fleet `all` and `read` privileges only — not by the
// sub-feature (agents/settings/agent_policies) or `minimal_*` privileges.
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
    user: testUsers.fleet_minimal_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agents_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_settings_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agent_policies_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_no_access,
    statusCode: 403,
  },
];

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  // A syntactically valid pattern that matches no index — the route returns 200 with
  // `{ results: { <pattern>: false } }`, so authorized users get 200 without any seeded data.
  const QUERY = 'dataStreams=logs-privileges.test-*&start=2015-01-01T00:00:00.000Z';

  const ROUTES = [
    {
      method: 'GET',
      path: `/api/fleet/data_streams/data?${QUERY}`,
      scenarios: READ_SCENARIOS,
    },
  ];

  describe('data_streams_has_data_privileges', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await setupTestUsers(getService('security'));
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}

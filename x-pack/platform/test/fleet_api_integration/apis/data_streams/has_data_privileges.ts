/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { runPrivilegeTests } from '../../privileges_helpers';
import { setupTestUsers, testUsers } from '../test_users';

// A syntactically valid pattern that matches no index. The route returns 200 with
// `{ results: { <pattern>: false } }`, so an authorized user gets 200 without any seeded data.
const TEST_PATTERN = 'logs-privileges.test-*';
const QUERY = `dataStreams=${TEST_PATTERN}&start=2015-01-01T00:00:00.000Z`;

// GET /api/fleet/data_streams/data needs authorization at two layers:
//   1. Kibana: FLEET_API_PRIVILEGES.FLEET.READ (fleetv2 `read`), granted only by the top-level
//      Fleet `all`/`read` privileges — not by the sub-feature or `minimal_*` privileges.
//   2. Elasticsearch: the handler runs the msearch as the current user, so the user also needs
//      `read` on the requested indices.
// The users below are defined locally because the shared `testUsers` fixtures only carry Kibana
// privileges (`setupTestUsers` passes `kibana:` alone to `security.role.create`).
const ES_PRIVILEGED_USERS = {
  fleet_all_with_es_read: {
    roleName: 'fleet_all_with_es_read',
    username: 'fleet_all_with_es_read',
    password: 'changeme',
    kibana: [{ feature: { fleetv2: ['all'] }, spaces: ['*'] }],
  },
  fleet_read_with_es_read: {
    roleName: 'fleet_read_with_es_read',
    username: 'fleet_read_with_es_read',
    password: 'changeme',
    kibana: [{ feature: { fleetv2: ['read'] }, spaces: ['*'] }],
  },
};

// Both layers satisfied → the search runs and returns results.
const AUTHORIZED_SCENARIOS = [
  {
    user: ES_PRIVILEGED_USERS.fleet_all_with_es_read,
    statusCode: 200,
  },
  {
    user: ES_PRIVILEGED_USERS.fleet_read_with_es_read,
    statusCode: 200,
  },
];

// Kibana authz passes but Elasticsearch denies the msearch. The handler converts the ES
// `security_exception` into a 403 rather than reporting "no data" — without that conversion these
// would return 200 with `false`, masking a permission problem as a false negative.
const ES_DENIED_SCENARIOS = [
  {
    user: testUsers.fleet_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_read_only,
    statusCode: 403,
  },
];

// Rejected by Kibana authz before reaching Elasticsearch.
const KIBANA_DENIED_SCENARIOS = [
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
  const security = getService('security');

  const path = `/api/fleet/data_streams/data?${QUERY}`;

  describe('data_streams_has_data_privileges', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await setupTestUsers(security);

      // Users that hold Fleet privileges *and* ES read on the queried pattern.
      for (const user of Object.values(ES_PRIVILEGED_USERS)) {
        await security.role.create(user.roleName, {
          kibana: user.kibana,
          elasticsearch: {
            indices: [{ names: [TEST_PATTERN], privileges: ['read'] }],
          },
        });
        await security.user.create(user.username, {
          password: user.password,
          roles: [user.roleName],
          full_name: user.username,
        });
      }
    });

    after(async () => {
      for (const user of Object.values(ES_PRIVILEGED_USERS)) {
        await security.user.delete(user.username);
        await security.role.delete(user.roleName);
      }
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('with Fleet and Elasticsearch read privileges', () => {
      runPrivilegeTests(
        [{ method: 'GET', path, scenarios: AUTHORIZED_SCENARIOS }],
        supertestWithoutAuth
      );
    });

    describe('with Fleet privileges but no Elasticsearch index access', () => {
      runPrivilegeTests(
        [{ method: 'GET', path, scenarios: ES_DENIED_SCENARIOS }],
        supertestWithoutAuth
      );
    });

    describe('without sufficient Fleet privileges', () => {
      runPrivilegeTests(
        [{ method: 'GET', path, scenarios: KIBANA_DENIED_SCENARIOS }],
        supertestWithoutAuth
      );
    });
  });
}

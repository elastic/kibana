/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from './test_users';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('Fleet Endpoints (part 3)', function () {
    before(async () => {
      await setupTestUsers(getService('security'));
    });

    // Fleet proxies
    loadTestFile(require.resolve('./fleet_proxies/crud')); // ~ 20s

    // Uninstall tokens
    loadTestFile(require.resolve('./uninstall_token/get')); // ~ 20s
    loadTestFile(require.resolve('./uninstall_token/privileges')); // ~ 20s

    // Fleet settings privileges
    loadTestFile(require.resolve('./fleet_settings_privileges')); // ~ 1m

    // Cloud connectors
    loadTestFile(require.resolve('./cloud_connector'));
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from './test_users';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('Fleet Endpoints (part 2)', function () {
    before(async () => {
      await setupTestUsers(getService('security'));
    });

    // Outputs
    loadTestFile(require.resolve('./outputs')); // ~ 1m 30s

    // Download sources
    loadTestFile(require.resolve('./download_sources')); // ~ 15s

    // Telemetry
    loadTestFile(require.resolve('./fleet_telemetry')); // ~ 30s

    // Integrations
    loadTestFile(require.resolve('./integrations')); // ~ 8s

    // Fleet server hosts
    loadTestFile(require.resolve('./fleet_server_hosts/crud')); // ~ 9s
  });
}

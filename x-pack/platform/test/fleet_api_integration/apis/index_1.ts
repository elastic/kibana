/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from './test_users';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  // total runtime ~ 4m
  describe('Fleet Endpoints (part 1)', function () {
    before(async () => {
      await setupTestUsers(getService('security'));
    });

    // Fleet setup
    loadTestFile(require.resolve('./fleet_setup')); // ~ 6s

    loadTestFile(require.resolve('./policy_secrets')); // ~40s

    loadTestFile(require.resolve('./enrollment_api_keys/crud')); // ~ 20s
    loadTestFile(require.resolve('./enrollment_api_keys/privileges')); // ~ 20s

    // Data Streams
    loadTestFile(require.resolve('./data_streams')); // ~ 20s

    // Settings
    loadTestFile(require.resolve('./settings')); // ~ 7s

    // Service tokens
    loadTestFile(require.resolve('./service_tokens')); // ~ 2s
  });
}

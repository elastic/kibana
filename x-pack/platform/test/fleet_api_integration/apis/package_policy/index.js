/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForFleetStartupSetup } from '../../helpers';
import { setupTestUsers } from '../test_users';

export default function loadTests(providerContext) {
  const { loadTestFile, getService } = providerContext;

  describe('Package policies', () => {
    before(async function () {
      this.timeout(3 * 60 * 1000);
      // Runs before every child suite's `before`, so no suite wipes Fleet state mid startup setup
      await waitForFleetStartupSetup(providerContext);
      await setupTestUsers(getService('security'));
    });
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./get'));

    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./upgrade'));
    loadTestFile(require.resolve('./input_package_create_upgrade'));
    loadTestFile(require.resolve('./input_package_rollback'));
    loadTestFile(require.resolve('./deployment_modes'));
    loadTestFile(require.resolve('./reusable_policies'));
    loadTestFile(require.resolve('./conditions'));
  });
}

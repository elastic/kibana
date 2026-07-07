/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

export default function maintenanceWindowInternalTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  describe('Maintenance Window - Group 15 (Internal APIs)', () => {
    before(async () => {
      await setupSpacesAndUsers(getService);
    });

    after(async () => {
      await tearDown(getService);
    });

    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/internal/get_maintenance_window')
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/internal/create_maintenance_window')
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/internal/update_maintenance_window')
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/internal/delete_maintenance_window')
    );
    loadTestFile(
      require.resolve(
        '../../../group3/tests/maintenance_window/internal/archive_maintenance_window'
      )
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/internal/finish_maintenance_window')
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/internal/find_maintenance_windows')
    );
    loadTestFile(
      require.resolve(
        '../../../group3/tests/maintenance_window/internal/active_maintenance_windows'
      )
    );
  });
}

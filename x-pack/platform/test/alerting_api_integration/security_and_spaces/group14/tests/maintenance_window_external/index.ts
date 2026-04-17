/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

export default function maintenanceWindowExternalTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  describe('Maintenance Window - Group 14 (External APIs)', () => {
    before(async () => {
      await setupSpacesAndUsers(getService);
    });

    after(async () => {
      await tearDown(getService);
    });

    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/external/get_maintenance_window')
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/external/create_maintenance_window')
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/external/delete_maintenance_window')
    );
    loadTestFile(
      require.resolve(
        '../../../group3/tests/maintenance_window/external/archive_maintenance_window'
      )
    );
    loadTestFile(
      require.resolve(
        '../../../group3/tests/maintenance_window/external/unarchive_maintenance_window'
      )
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/external/update_maintenance_window')
    );
    loadTestFile(
      require.resolve('../../../group3/tests/maintenance_window/external/find_maintenance_window')
    );
  });
}

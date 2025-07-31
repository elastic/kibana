/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

export default function maintenanceWindowTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Maintenance Window - Group 3', () => {
    describe('maintenance window', () => {
      before(async () => {
        await setupSpacesAndUsers(getService);
      });

      after(async () => {
        await tearDown(getService);
      });

      // External APIs
      loadTestFile(require.resolve('./external/get_maintenance_window'));
      loadTestFile(require.resolve('./external/create_maintenance_window'));
      loadTestFile(require.resolve('./external/delete_maintenance_window'));
      loadTestFile(require.resolve('./external/archive_maintenance_window'));
      loadTestFile(require.resolve('./external/unarchive_maintenance_window'));
      loadTestFile(require.resolve('./external/update_maintenance_window'));

      // Internal APIs
      loadTestFile(require.resolve('./internal/get_maintenance_window'));
      loadTestFile(require.resolve('./internal/create_maintenance_window'));
      loadTestFile(require.resolve('./internal/update_maintenance_window'));
      loadTestFile(require.resolve('./internal/delete_maintenance_window'));
      loadTestFile(require.resolve('./internal/archive_maintenance_window'));
      loadTestFile(require.resolve('./internal/finish_maintenance_window'));
      loadTestFile(require.resolve('./internal/find_maintenance_windows'));
      loadTestFile(require.resolve('./internal/active_maintenance_windows'));

      // event generation task
      loadTestFile(require.resolve('./events_generation'));
    });
  });
}

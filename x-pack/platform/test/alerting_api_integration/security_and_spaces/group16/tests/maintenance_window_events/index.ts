/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

export default function maintenanceWindowEventsTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  describe('Maintenance Window - Group 16 (Events Generation)', () => {
    before(async () => {
      await setupSpacesAndUsers(getService);
    });

    after(async () => {
      await tearDown(getService);
    });

    loadTestFile(require.resolve('../../../group3/tests/maintenance_window/events_generation'));
  });
}

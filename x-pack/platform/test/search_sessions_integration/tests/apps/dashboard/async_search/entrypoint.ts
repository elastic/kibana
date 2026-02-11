/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardName = 'Not Delayed';

  const { dashboard } = getPageObjects(['dashboard']);
  const searchSessions = getService('searchSessions');

  describe('dashboard background search entrypoints', function () {
    beforeEach(async () => {
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
    });

    describe('when in edit mode', () => {
      describe('when clicking the open background search flyout button', () => {
        it('opens the background search flyout', async () => {
          await dashboard.loadDashboardInEditMode(dashboardName);

          await searchSessions.openFlyout();
          await searchSessions.expectManagementTable();
        });
      });
    });

    describe('when in view mode', () => {
      describe('when clicking the open background search flyout button', () => {
        it('opens the background search flyout', async () => {
          await dashboard.loadSavedDashboard(dashboardName);

          await searchSessions.openFlyout();
          await searchSessions.expectManagementTable();
        });
      });
    });
  });
}

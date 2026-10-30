/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CONTENT_LIST_TEST_SUBJECTS } from '@kbn/content-list-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { dashboard, security } = getPageObjects(['dashboard', 'security']);

  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const securityService = getService('security');
  const testSubjects = getService('testSubjects');

  /**
   * Purpose: Verify created_by column added when created and not removed on edit
   *
   * Migration: Remove test, duplicated by dashboard API tests
   */
  describe('created_by', function () {
    const DASHBOARD_NAME = 'veryuniquemydashboardname';
    const USERNAME_1 = 'global_dashboard_all_user_1';
    const USERNAME_2 = 'global_dashboard_all_user_2';
    const USER_FULL_NAME_1 = 'global dashboard all user 1';
    const USER_FULL_NAME_2 = 'global dashboard all user 2';

    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );

      // ensure we're logged out so we can login as the appropriate users
      await security.forceLogout();

      await securityService.role.create('global_dashboard_all_role', {
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            feature: {
              dashboard: ['all'],
              visualize: ['all'],
            },
            spaces: ['*'],
          },
        ],
      });

      await securityService.user.create(USERNAME_1, {
        password: 'changeme',
        roles: ['global_dashboard_all_role'],
        full_name: USER_FULL_NAME_1,
      });
      await securityService.user.create(USERNAME_2, {
        password: 'changeme',
        roles: ['global_dashboard_all_role'],
        full_name: USER_FULL_NAME_2,
      });

      await security.login(USERNAME_1, 'changeme', {
        expectSpaceSelector: false,
      });

      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
      await dashboard.clickNewDashboard();
      await dashboard.saveDashboard(DASHBOARD_NAME, {
        saveAsNew: true,
        waitDialogIsClosed: false,
        exitFromEditMode: false,
      });
      await dashboard.gotoDashboardLandingPage();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      await security.forceLogout();
      await securityService.role.delete('global_dashboard_all_role');
      await securityService.user.delete(USERNAME_1);
      await securityService.user.delete(USERNAME_2);

      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.importExport.unload(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );
    });

    it('shows creator column', async () => {
      await testSubjects.existOrFail(CONTENT_LIST_TEST_SUBJECTS.columnCreatedBy);
      await testSubjects.existOrFail(CONTENT_LIST_TEST_SUBJECTS.createdByAvatar);
    });

    it('can filter by created_by', async () => {
      await listingTable.expectItemsCount('dashboard', 20);
      await listingTable.selectUsers(USER_FULL_NAME_1);
      await listingTable.expectItemsCount('dashboard', 1);
      expect(await listingTable.getAllItemsNames()).to.eql([DASHBOARD_NAME]);

      // Unselect the user, then select "No creator".
      await listingTable.selectUsers(USER_FULL_NAME_1);
      await listingTable.expectItemsCount('dashboard', 20);
      await listingTable.selectUsers('No creator');
      expect(await listingTable.getAllItemsNames()).not.to.contain(DASHBOARD_NAME);
      // Unselect "No creator", then select the user.
      await listingTable.selectUsers('No creator');
      await listingTable.expectItemsCount('dashboard', 20);
      await listingTable.selectUsers(USER_FULL_NAME_1);
      await listingTable.expectItemsCount('dashboard', 1);
    });

    it("doesn't override creator when editing a dashboard", async () => {
      await security.forceLogout();
      await security.login(USERNAME_2, 'changeme', {
        expectSpaceSelector: false,
      });
      await dashboard.navigateToApp();
      await listingTable.searchForItemWithName(DASHBOARD_NAME);
      await testSubjects.existOrFail(CONTENT_LIST_TEST_SUBJECTS.columnCreatedBy);
      expect(
        await testSubjects.getAttribute(CONTENT_LIST_TEST_SUBJECTS.createdByAvatar, 'aria-label')
      ).to.be(`Filter by creator: ${USER_FULL_NAME_1}`);
      await dashboard.loadDashboardInEditMode(DASHBOARD_NAME);
      await dashboard.addVisualizations(['A Pie']);
      await dashboard.saveDashboard(DASHBOARD_NAME, {
        waitDialogIsClosed: false,
        exitFromEditMode: false,
      });
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchForItemWithName(DASHBOARD_NAME);
      await testSubjects.existOrFail(CONTENT_LIST_TEST_SUBJECTS.columnCreatedBy);
      expect(
        await testSubjects.getAttribute(CONTENT_LIST_TEST_SUBJECTS.createdByAvatar, 'aria-label')
      ).to.be(`Filter by creator: ${USER_FULL_NAME_1}`);
    });
  });
}

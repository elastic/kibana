/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'common']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Disabled UIs', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
    });

    const DISABLED_PLUGINS = [
      {
        appName: 'Upgrade Assistant',
        url: 'stack/upgrade_assistant',
      },
      {
        appName: 'Migrate',
        url: 'data/migrate_data',
      },
      {
        appName: 'Remote Clusters',
        url: 'data/remote_clusters',
      },
      {
        appName: 'Cross-Cluster Replication',
        url: 'data/cross_cluster_replication',
      },
      {
        appName: 'Snapshot and Restore',
        url: 'data/snapshot_restore',
      },
      {
        appName: 'Index Lifecycle Management',
        url: 'data/index_lifecycle_management',
      },
      {
        appName: 'Rollup Jobs',
        url: 'data/rollup_jobs',
      },
      {
        appName: 'License Management',
        url: 'stack/license_management',
      },
      {
        appName: 'Watcher',
        url: 'insightsAndAlerting/watcher',
      },
      {
        appName: 'Users',
        url: 'security/users',
      },
      {
        appName: 'Role Mappings',
        url: 'security/role_mappings',
      },
    ];

    DISABLED_PLUGINS.forEach(({ appName, url }) => {
      it(`${appName} is not accessible`, async () => {
        await pageObjects.common.navigateToUrl('management', url, {
          shouldUseHashForSubUrl: false,
        });
        // If the route doesn't exist, the user will be redirected back to the Management landing page
        // Wait for the redirect to complete and verify the management landing page is visible
        await retry.waitFor('management landing page to be visible', async () => {
          return await testSubjects.exists('cards-navigation-page');
        });
        expect(await testSubjects.exists('cards-navigation-page')).to.be(true);
      });
    });
  });
}

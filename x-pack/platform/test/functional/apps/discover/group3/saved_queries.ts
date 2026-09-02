/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migration recommendation: MIXED. Saved-query CRUD through the popover is already covered in
 * Scout by src/platform/plugins/shared/unified_search/test/scout/ui/tests/saved_query_menu_crud.spec.ts;
 * only the cross-space sharing case is unique to this file.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  const { common, settings, shareSavedObjectsToSpace } = getPageObjects([
    'common',
    'settings',
    'shareSavedObjectsToSpace',
  ]);
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');
  const queryBar = getService('queryBar');

  const savedQueryName = 'shared-saved-query';
  const destinationSpaceId = 'nondefaultspace';

  describe('Discover Saved Queries', () => {
    before('initialize tests', async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );
      await spaces.create({
        id: destinationSpaceId,
        name: 'Non-default Space',
        disabledFeatures: [],
      });
    });

    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );
      await spaces.delete(destinationSpaceId);
    });

    describe('Manage saved queries', () => {
      /**
       * Migration recommendation: MIGRATE TO SCOUT. Deleting a saved query that is shared into a
       * second space is a real multi-space saved-object contract with no other coverage. Belongs
       * next to the existing saved-query specs in
       * src/platform/plugins/shared/unified_search/test/scout/ui/tests. The Saved Objects
       * management leg (navigate to settings, open the share-to-space flyout) can be replaced by a
       * `kbnClient` share call so only the Discover delete + reload stays in the browser.
       */
      it('delete saved query shared in multiple spaces', async () => {
        // Navigate to Discover & create a saved query
        await common.navigateToApp('discover');
        await queryBar.setQuery('response:200');
        await queryBar.submitQuery();
        await savedQueryManagementComponent.saveNewQuery(savedQueryName, '', true, false);
        await savedQueryManagementComponent.savedQueryExistOrFail(savedQueryName);
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();

        // Navigate to settings & share the saved query between multiple spaces
        await common.navigateToApp('settings');
        await settings.clickKibanaSavedObjects();
        await shareSavedObjectsToSpace.openShareToSpaceFlyoutForObject(savedQueryName);
        await shareSavedObjectsToSpace.setupForm({
          destinationSpaceId,
        });
        await shareSavedObjectsToSpace.saveShare();

        // Navigate back to Discover and delete the query
        await common.navigateToApp('discover');
        await savedQueryManagementComponent.deleteSavedQuery(savedQueryName);

        // Refresh to ensure the object is actually deleted
        await browser.refresh();
        await savedQueryManagementComponent.savedQueryMissingOrFail(savedQueryName);
      });

      /**
       * Migration recommendation: DELETE. Covered by the 'update the loaded query and re-load it'
       * step of saved_query_menu_crud.spec.ts, which additionally asserts the persisted query
       * string — this test only asserts the query still appears in the list.
       */
      it('updates a saved query', async () => {
        const name = `${savedQueryName}-update`;

        // Navigate to Discover & create a saved query
        await common.navigateToApp('discover');
        await queryBar.setQuery('response:200');
        await queryBar.submitQuery();
        await savedQueryManagementComponent.saveNewQuery(name, '', true, false);
        await savedQueryManagementComponent.savedQueryExistOrFail(name);
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();

        // Update the saved query
        await queryBar.setQuery('response:404');
        await queryBar.submitQuery();
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery('', true, false);

        // Navigate to Discover ensure updated query exists
        await common.navigateToApp('discover');
        await savedQueryManagementComponent.savedQueryExistOrFail(name);
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();
        await savedQueryManagementComponent.deleteSavedQuery(name);
      });
    });
  });
}

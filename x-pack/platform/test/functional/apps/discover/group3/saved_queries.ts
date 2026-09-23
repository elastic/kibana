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
       * Migration recommendation: API TEST, then DELETE. The multi-space saved-object contract
       * (create query, share to second space, delete space, verify query survives) is entirely
       * expressible via `kbnClient` calls without a browser: create the SO, share it with the
       * Spaces API, delete the space, assert the SO still exists and is accessible in the original
       * space. The Discover UI itself has no unique rendering logic for this scenario, so a browser
       * test would duplicate what the SO/Spaces API contract already guarantees.
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

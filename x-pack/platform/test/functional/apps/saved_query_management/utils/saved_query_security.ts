/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Migration recommendation: DELETE. Dead code: no config, `loadTestFile` or import references
 * this helper. All 10 tests are already covered by Scout in
 * src/platform/plugins/shared/unified_search/test/scout/ui/tests
 * (`saved_query_menu_crud`, `saved_query_menu_readonly`, `saved_query_menu_privileges_matrix`).
 */

export function getSavedQuerySecurityUtils({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['header']);
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');

  return {
    shouldAllowSavingQueries: () => {
      {
        /**
         * Migration recommendation: DELETE. Covered by `saved_query_menu_crud.spec.ts` (save new and delete steps).
         */
        it('allows saving via the saved query management component popover with no saved query loaded', async () => {
          await queryBar.setQuery('response:200');
          await savedQueryManagementComponent.saveNewQuery('foo', 'bar', true, false);
          await savedQueryManagementComponent.savedQueryExistOrFail('foo');
          await savedQueryManagementComponent.closeSavedQueryManagementComponent();

          await savedQueryManagementComponent.deleteSavedQuery('foo');
          await savedQueryManagementComponent.savedQueryMissingOrFail('foo');
        });

        /**
         * Migration recommendation: DELETE. Covered by `saved_query_menu_crud.spec.ts` (update loaded query step).
         */
        it('allow saving changes to a currently loaded query via the saved query management component', async () => {
          await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
          await queryBar.setQuery('response:404');
          await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
            'new description',
            true,
            false
          );
          await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
          await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
          const queryString = await queryBar.getQueryString();
          expect(queryString).to.eql('response:404');

          // Reset after changing
          await queryBar.setQuery('response:200');
          await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
            'Ok responses for jpg files',
            true,
            false
          );
        });

        /**
         * Migration recommendation: DELETE. Covered by `saved_query_menu_crud.spec.ts` (save as new copy step).
         */
        it('allow saving currently loaded query as a copy', async () => {
          await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
          await queryBar.setQuery('response:404');
          await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
            'ok2',
            'description',
            true,
            false
          );
          await PageObjects.header.waitUntilLoadingHasFinished();
          await savedQueryManagementComponent.savedQueryExistOrFail('ok2');
          await savedQueryManagementComponent.closeSavedQueryManagementComponent();
          await testSubjects.click('showQueryBarMenu');
          await savedQueryManagementComponent.deleteSavedQuery('ok2');
        });
      }
    },
    shouldDisallowSavingButAllowLoadingSavedQueries: () => {
      /**
       * Migration recommendation: DELETE. Covered by `saved_query_menu_readonly.spec.ts` (load step).
       */
      it('allows loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:200');
      });

      /**
       * Migration recommendation: DELETE. Covered by `saved_query_menu_readonly.spec.ts` (save disabled step).
       */
      it('does not allow saving via the saved query management component popover with no query loaded', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail();
      });

      /**
       * Migration recommendation: DELETE. Covered by `saved_query_menu_readonly.spec.ts` (save-changes hidden step).
       */
      it('does not allow saving changes to saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
      });

      /**
       * Migration recommendation: DELETE. Covered by `saved_query_menu_readonly.spec.ts` (per-row delete hidden step).
       */
      it('does not allow deleting a saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
      });

      /**
       * Migration recommendation: DELETE. Covered by `saved_query_menu_readonly.spec.ts` (clear step).
       */
      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });
    },
    shouldDisallowAccessToSavedQueries: () => {
      /**
       * Migration recommendation: DELETE. Covered by the `sqm:none` case in `saved_query_menu_privileges_matrix.spec.ts`.
       */
      it('does not allow loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.savedQueryLoadButtonMissingOrFail();
      });

      /**
       * Migration recommendation: DELETE. Covered by the `sqm:none` case in `saved_query_menu_privileges_matrix.spec.ts`.
       */
      it('does not allow saving via the saved query management component', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail('hidden');
      });
    },
  };
}

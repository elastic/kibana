/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export function getSavedQuerySecurityUtils({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['header']);
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');

  return {
    shouldAllowSavingQueries: () => {
      {
        it('allows saving via the saved query management component popover with no saved query loaded', async () => {
          await queryBar.setQuery('response:200');
          await savedQueryManagementComponent.saveNewQuery('foo', 'bar', true, false);
          await savedQueryManagementComponent.savedQueryExistOrFail('foo');
          await savedQueryManagementComponent.closeSavedQueryManagementComponent();

          await savedQueryManagementComponent.deleteSavedQuery('foo');
          await savedQueryManagementComponent.savedQueryMissingOrFail('foo');
        });

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
      it('allows loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:200');
      });

      it('does not allow saving via the saved query management component popover with no query loaded', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail();
      });

      it('does not allow saving changes to saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
      });

      it('does not allow deleting a saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });
    },
    shouldDisallowAccessToSavedQueries: () => {
      it('does not allow loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.savedQueryLoadButtonMissingOrFail();
      });

      it('does not allow saving via the saved query management component', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail('hidden');
      });
    },
  };
}

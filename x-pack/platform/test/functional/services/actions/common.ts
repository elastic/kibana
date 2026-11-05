/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProvidedType } from '@kbn/test';
import type { FtrProviderContext } from '../../ftr_provider_context';

export type ActionsCommon = ProvidedType<typeof ActionsCommonServiceProvider>;

export function ActionsCommonServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async openNewConnectorForm(name: string) {
      const createBtn = await testSubjects.find('createConnectorButton');
      const createBtnIsVisible = await createBtn.isDisplayed();
      if (createBtnIsVisible) {
        await createBtn.click();
      } else {
        await testSubjects.click('createFirstActionButton');
      }

      // The card grid re-orders as the action types resolve and a click on a card React is
      // re-creating is silently dropped, so the selection has to be retried. existOrFail
      // defaults to the same 2 minute budget as retry.try, which would spend it all on the
      // first attempt, so bound it. Skip the click once the form is up, since the card is
      // gone by then and a slow form must not be mistaken for a dropped click.
      await retry.try(async () => {
        if (await testSubjects.exists(`.${name}-card`)) {
          await testSubjects.click(`.${name}-card`);
        }
        await testSubjects.existOrFail('create-connector-flyout-save-btn', { timeout: 10_000 });
      });
    },

    async cancelConnectorForm() {
      const flyOutCancelButton = await testSubjects.find('edit-connector-flyout-close-btn');
      const isEnabled = await flyOutCancelButton.isEnabled();
      const isDisplayed = await flyOutCancelButton.isDisplayed();

      if (isEnabled && isDisplayed) {
        await flyOutCancelButton.click();
        await testSubjects.missingOrFail('edit-connector-flyout-close-btn');
      }
    },
  };
}

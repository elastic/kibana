/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Custom statuses settings section. Only rendered when
 * `xpack.cases.customStatuses.enabled` is ON, which `group2/config.ts` pins.
 */
export default ({ getPageObject, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const toasts = getService('toasts');
  const header = getPageObject('header');

  describe('Configure - custom statuses', function () {
    before(async () => {
      await cases.navigation.navigateToConfigurationPage();
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('lists the built-in statuses grouped by category', async () => {
      await testSubjects.existOrFail('cases-statuses-section');
      await testSubjects.existOrFail('cases-statuses-experimental-badge');

      for (const key of ['open', 'in-progress', 'closed']) {
        await testSubjects.existOrFail(`case-statuses-group-${key}`);
        await testSubjects.existOrFail(`case-statuses-help-${key}`);
        await testSubjects.existOrFail(`case-status-row-${key}`);
        await testSubjects.existOrFail(`case-status-${key}-default-badge`);
      }
    });

    it('adds a status to a category', async () => {
      await testSubjects.click('case-statuses-add-in-progress');
      await testSubjects.existOrFail('common-flyout');

      await testSubjects.setValue('case-status-label-input', 'Awaiting customer');
      await testSubjects.click('common-flyout-save');
      await toasts.dismissAll();
      await header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('case-status-row-awaiting_customer');
      await testSubjects.missingOrFail('case-status-awaiting_customer-default-badge');

      // The key is derived from the label and shown read-only when editing.
      await testSubjects.click('case-status-awaiting_customer-actions');
      await testSubjects.click('case-status-awaiting_customer-edit');
      expect(await testSubjects.getAttribute('case-status-key-readonly', 'value')).to.be(
        'awaiting_customer'
      );
      await testSubjects.click('common-flyout-cancel');
    });

    it('offers the new status in the case list filter', async () => {
      await cases.navigation.navigateToApp();
      await testSubjects.click('options-filter-popover-button-status');
      await testSubjects.existOrFail('options-filter-popover-item-awaiting_customer');
    });
  });
};

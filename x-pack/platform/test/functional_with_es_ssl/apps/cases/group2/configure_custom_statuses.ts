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
  const browser = getService('browser');
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

    it('suggests an On hold status and seeds the pause reasons when added', async () => {
      await testSubjects.existOrFail('case-statuses-on-hold-callout');
      await testSubjects.missingOrFail('case-pause-reasons');

      await testSubjects.click('case-statuses-add-on-hold');
      await toasts.dismissAll();
      await header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('case-status-row-on_hold');
      await testSubjects.existOrFail('case-status-on_hold-pausing-badge');
      await testSubjects.missingOrFail('case-statuses-on-hold-callout');
      await testSubjects.existOrFail('case-pause-reasons');
      await testSubjects.existOrFail('case-pause-reason-row-Awaiting customer');
    });

    it('adds a pause reason and does not let the last one go', async () => {
      await testSubjects.click('case-pause-reasons-add');
      await testSubjects.existOrFail('common-flyout');
      await testSubjects.setValue('case-pause-reason-input', 'Waiting on legal');
      await testSubjects.click('common-flyout-save');
      await toasts.dismissAll();
      await header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('case-pause-reason-row-Waiting on legal');

      for (const reason of [
        'Awaiting vendor',
        'Awaiting another team',
        'Scheduled work',
        'Waiting on legal',
      ]) {
        await testSubjects.click(`case-pause-reason-${reason}-actions`);
        await testSubjects.click(`case-pause-reason-${reason}-remove`);
        await toasts.dismissAll();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail(`case-pause-reason-row-${reason}`);
      }

      await testSubjects.click('case-pause-reason-Awaiting customer-actions');
      expect(await testSubjects.isEnabled('case-pause-reason-Awaiting customer-remove')).to.be(
        false
      );
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('keeps the pausing switch off the category default', async () => {
      await testSubjects.click('case-status-in-progress-actions');
      await testSubjects.click('case-status-in-progress-edit');
      await testSubjects.existOrFail('common-flyout');
      expect(await testSubjects.isEnabled('case-status-pauses-time-tracking')).to.be(false);
      await testSubjects.click('common-flyout-cancel');
    });

    it('offers the new status in the case list filter', async () => {
      await cases.navigation.navigateToApp();
      await testSubjects.click('options-filter-popover-button-status');
      await testSubjects.existOrFail('options-filter-popover-item-awaiting_customer');
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObject }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');
  const browser = getService('browser');
  const dashboard = getPageObject('dashboard');
  const common = getPageObject('common');
  const retry = getService('retry');
  const reportingFunctional = getService('reportingFunctional');
  const reportingAPI = getService('reportingAPI');
  const comboBox = getService('comboBox');

  describe('Scheduled Reports Flyout', () => {
    const openFlyout = async () => {
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('Ecom Dashboard');
      await testSubjects.click('exportTopNavButton');
      await testSubjects.click('scheduleExport');
      await testSubjects.existOrFail('exportItemDetailsFlyout');
    };

    const fillInSchedule = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const futureDateString = tomorrow.toLocaleDateString();
      await testSubjects.setValue('startDatePicker', futureDateString);
      // Close the date picker to prevent it from blocking other fields
      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.setValue('timezoneCombobox', 'UTC');
      // Close the timezone picker to prevent it from blocking other fields
      await browser.pressKeys(browser.keys.ESCAPE);
    };

    before(async () => {
      await reportingFunctional.initEcommerce();
    });

    after(async () => {
      await reportingFunctional.teardownEcommerce();
      await reportingAPI.deleteAllReports();
    });

    afterEach(async () => {
      if (await testSubjects.exists('exportItemDetailsFlyout')) {
        await testSubjects.click('euiFlyoutCloseButton');
      }
      await toasts.dismissIfExists();
    });

    it('validates required fields', async () => {
      await retry.try(() => reportingFunctional.loginReportingManager());
      await openFlyout();

      // Verify the title field is pre-filled with the dashboard name
      const titleInput = await testSubjects.find('reportTitleInput');
      const titleValue = await titleInput.getAttribute('value');
      expect(titleValue).to.equal('Ecom Dashboard');

      // Test date validation with a past date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDateString = yesterday.toLocaleDateString();
      await testSubjects.setValue('startDatePicker', pastDateString);
      // Close the date picker by pressing Escape key
      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.click('scheduleExportSubmitButton');

      // Verify past date validation error appears, retrying to wait for validation
      await retry.waitFor('form validation', async () =>
        (
          await testSubjects.getVisibleText('exportItemDetailsFlyout')
        ).includes('Start date must be in the future')
      );

      // Fill in all required fields with a future date
      await fillInSchedule();

      // Submit should succeed without email
      await testSubjects.click('scheduleExportSubmitButton');
      await retry.try(async () => {
        const successToast = await toasts.getElementByIndex(1);
        expect(await successToast.getVisibleText()).to.contain('Export scheduled');
      });
    });

    it('validates email fields when email is enabled', async () => {
      await openFlyout();

      // Fill required fields with a future date
      await testSubjects.setValue('reportTitleInput', 'Test Report');
      await fillInSchedule();

      // Enable email
      await testSubjects.click('sendByEmailToggle');

      // Try to submit without email recipient - should show validation error
      await testSubjects.click('scheduleExportSubmitButton');
      await retry.waitFor('form validation', async () =>
        (
          await testSubjects.getVisibleText('exportItemDetailsFlyout')
        ).includes('Provide at least one recipient')
      );

      // Add invalid email - should show validation warning
      await comboBox.setCustom('emailRecipientsCombobox', 'invalid-email');
      await testSubjects.click('scheduleExportSubmitButton');
      expect(await testSubjects.getVisibleText('exportItemDetailsFlyout')).to.contain(
        'Email address invalid-email is not valid'
      );

      // Add valid email
      await comboBox.setCustom('emailRecipientsCombobox', 'user@example.com');

      // Submit should succeed
      await testSubjects.click('scheduleExportSubmitButton');
      await retry.try(async () => {
        const successToast = await toasts.getElementByIndex(1);
        expect(await successToast.getVisibleText()).to.contain('Export scheduled');
      });
    });

    it('without reporting management privileges disables and hides the email recipient fields', async () => {
      await retry.try(() => reportingFunctional.loginReportingUser());
      await openFlyout();

      // Enable email
      await testSubjects.click('sendByEmailToggle');

      // Non-managers can only email the reports to themselves so the `To` field should be
      // pre-filled and disabled
      const emailToField = await (
        await testSubjects.find('emailRecipientsCombobox')
      ).findByTestSubject('comboBoxSearchInput');
      expect(await emailToField.isEnabled()).to.equal(false);
      expect((await comboBox.getComboBoxSelectedOptions('emailRecipientsCombobox'))[0]).to.equal(
        'reportinguser@example.com'
      );
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'reporting', 'dashboard', 'security', 'exports']);
  const toasts = getService('toasts');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const reportingFunctional = getService('reportingFunctional');
  const reportingApi = getService('reportingAPI');
  const retry = getService('retry');

  describe('Access to Management > Reporting', () => {
    before(async () => {
      await reportingFunctional.initEcommerce();
    });
    after(async () => {
      await reportingFunctional.teardownEcommerce();
      await reportingApi.deleteAllReports();
    });

    describe('Exports', () => {
      it('does allow user with reporting privileges', async () => {
        await reportingFunctional.loginReportingUser();
        await PageObjects.common.navigateToApp('reporting');
        await testSubjects.existOrFail('reportJobListing');
      });

      it('Allows users to navigate back to where a report was generated', async () => {
        const dashboardTitle = 'Ecom Dashboard';
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);

        await PageObjects.reporting.selectExportItem('PDF');
        await PageObjects.reporting.clickGenerateReportButton();

        await PageObjects.common.navigateToApp('reporting');
        await PageObjects.common.sleep(3000); // Wait an amount of time for auto-polling to refresh the jobs

        // We do not need to wait for the report to finish generating
        await (await testSubjects.find('euiCollapsedItemActionsButton')).click();
        await (await testSubjects.find('reportOpenInKibanaApp')).click();

        const [, dashboardWindowHandle] = await browser.getAllWindowHandles();
        await browser.switchToWindow(dashboardWindowHandle);

        await PageObjects.dashboard.expectOnDashboard(dashboardTitle);
      });

      it('Allows user to view report details', async () => {
        await retry.try(async () => {
          await PageObjects.common.navigateToApp('reporting');
        });

        await testSubjects.existOrFail('reportJobListing');

        await (await testSubjects.findAll('euiCollapsedItemActionsButton'))[0].click();

        await (await testSubjects.find('reportViewInfoLink')).click();

        await testSubjects.existOrFail('reportInfoFlyout');
        await testSubjects.click('euiFlyoutCloseButton');
        await testSubjects.missingOrFail('reportInfoFlyout');
      });
    });

    describe('Schedules', () => {
      const dashboardTitle = 'Ecom Dashboard';
      it('does allow user with reporting privileges to navigate to the Schedules tab', async () => {
        await retry.try(async () => {
          await PageObjects.common.navigateToApp('reporting');
        });

        await (await testSubjects.find('reportingTabs-schedules')).click();
        await testSubjects.existOrFail('reportSchedulesTable');
      });

      it('allows user to navigate to schedules tab from where report was generated', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);

        await PageObjects.exports.clickExportTopNavButton();
        await (await testSubjects.find('scheduleExport')).click();
        await testSubjects.existOrFail('exportItemDetailsFlyout');

        await (await testSubjects.find('scheduleExportSubmitButton')).click();

        const successToast = await toasts.getElementByIndex(1);
        expect(await successToast.getVisibleText()).to.contain(
          'Find your schedule information and your exports in the Reporting page'
        );
        await toasts.dismissAll();

        await PageObjects.common.navigateToApp('reporting');
        await (await testSubjects.find('reportingTabs-schedules')).click();
        await testSubjects.existOrFail('reportSchedulesTable');

        const title = await testSubjects.getVisibleText('reportTitle');
        expect(title).to.contain(dashboardTitle);
      });

      it('allows user to view schedule config in flyout', async () => {
        await testSubjects.existOrFail('reportSchedulesTable');
        await (await testSubjects.findAll('euiCollapsedItemActionsButton'))[0].click();
        const viewConfigButton = await find.byCssSelector(`[data-test-subj*="reportViewConfig-"]`);

        await viewConfigButton.click();

        await testSubjects.existOrFail('scheduledReportFlyout');
        await testSubjects.click('euiFlyoutCloseButton');
        await testSubjects.missingOrFail('scheduledReportFlyout');
      });

      it('allows user to disable schedule', async () => {
        await testSubjects.existOrFail('reportSchedulesTable');
        await (await testSubjects.findAll('euiCollapsedItemActionsButton'))[0].click();
        const disableButton = await find.byCssSelector(
          `[data-test-subj*="reportDisableSchedule-"]`
        );

        await disableButton.click();

        await testSubjects.existOrFail('confirm-disable-modal');
        await testSubjects.click('confirmModalConfirmButton');
        await testSubjects.missingOrFail('confirm-disable-modal');

        const successToast = await toasts.getElementByIndex(1);
        expect(await successToast.getVisibleText()).to.contain('Scheduled report disabled');
        await toasts.dismissAll();

        await testSubjects.existOrFail('reportStatus-disabled');
      });

      it('allows user to open dashboard', async () => {
        await testSubjects.existOrFail('reportSchedulesTable');
        await (await testSubjects.findAll('euiCollapsedItemActionsButton'))[0].click();
        const openDashboardButton = await find.byCssSelector(
          `[data-test-subj*="reportOpenDashboard-"]`
        );

        await openDashboardButton.click();

        const [, , dashboardWindowHandle] = await browser.getAllWindowHandles(); // it is the third window handle

        await browser.switchToWindow(dashboardWindowHandle);

        await PageObjects.dashboard.expectOnDashboard(dashboardTitle);
      });
    });

    describe('non privilege user', () => {
      it('does not allow user that does not have reporting privileges', async () => {
        await retry.try(async () => {
          await reportingFunctional.loginDataAnalyst();
          await PageObjects.common.navigateToApp('reporting');
        });

        await testSubjects.missingOrFail('reportJobListing');
      });

      it('does not allow user to access schedules that does not have reporting privileges', async () => {
        await testSubjects.missingOrFail('reportingTabs-schedules');
      });
    });
  });
};

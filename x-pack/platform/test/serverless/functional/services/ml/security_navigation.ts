/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningNavigationProviderSecurity({
  getService,
  getPageObject,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);

  async function navigateToArea(id: string, expectedTestSubject: string) {
    await retry.tryForTime(20 * 1000, async () => {
      await svlCommonNavigation.sidenav.clickLink({ navId: 'stack_management' });
      await svlCommonNavigation.sidenav.clickPanelLink(id);
      await testSubjects.existOrFail(expectedTestSubject, { timeout: 2500 });
    });
  }

  return {
    async navigateToAnomalyDetection() {
      await navigateToArea('management:anomaly_detection', 'ml-jobs-list');
    },
    async navigateToDataFrameAnalytics() {
      await navigateToArea('management:analytics', 'mlAnalyticsJobList');
    },
    async navigateToTrainedModels() {
      await navigateToArea('management:trained_models', 'mlTrainedModelsList');
    },

    /*
     * navigateToMemoryUsage and navigateToNotifications use direct app navigation
     * instead of sidenav interactions. These tests were previously landing on the
     * stack management rules page then redirecting to the appropriate ML page.
     * With the introduction of unified rules and its exclusion from the side nav,
     * the management:triggersActions redirect navigated the browser to /app/rules,
     * which does not render the stack management nav panel, causing the tests to fail.
     * Using direct app navigation avoids this.
     * https://github.com/elastic/kibana/issues/259819
     */
    async navigateToMemoryUsage() {
      await retry.tryForTime(20 * 1000, async () => {
        await PageObjects.common.navigateToApp('management', {
          path: 'ml/overview',
        });
        await testSubjects.existOrFail('mlStackManagementOverviewPage', { timeout: 2500 });
      });
      await testSubjects.existOrFail('mlMemoryUsagePanel', { timeout: 2500 });
    },
    async navigateToNotifications() {
      await retry.tryForTime(20 * 1000, async () => {
        await PageObjects.common.navigateToApp('management', {
          path: 'ml/overview',
        });
        await testSubjects.existOrFail('mlStackManagementOverviewPage', { timeout: 2500 });
      });
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.click('mlManagementOverviewPageTabs notifications');
        await testSubjects.existOrFail('mlNotificationsTable loaded');
      });
    },
  };
}

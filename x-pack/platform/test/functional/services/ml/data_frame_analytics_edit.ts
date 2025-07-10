/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  TimeRangeType,
  TIME_RANGE_TYPE,
  URL_TYPE,
} from '@kbn/ml-plugin/public/application/components/custom_urls/custom_url_editor/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';
import { MlCustomUrls } from './custom_urls';

export interface DiscoverUrlConfig {
  label: string;
  indexName: string;
  queryEntityFieldNames: string[];
  timeRange: TimeRangeType;
  timeRangeInterval?: string;
}

export interface DashboardUrlConfig {
  label: string;
  dashboardName: string;
  queryEntityFieldNames: string[];
  timeRange: TimeRangeType;
  timeRangeInterval?: string;
}

export interface OtherUrlConfig {
  label: string;
  url: string;
}

export function MachineLearningDataFrameAnalyticsEditProvider(
  { getPageObject, getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
  customUrls: MlCustomUrls
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const headerPage = getPageObject('header');

  return {
    async openEditCustomUrlsForJobTab(analyticsId: string) {
      // click Custom URLs tab
      await testSubjects.click('mlEditAnalyticsJobFlyout-customUrls');
      await this.ensureEditCustomUrlTabOpen();
      await headerPage.waitUntilLoadingHasFinished();
    },

    async ensureEditCustomUrlTabOpen() {
      await testSubjects.existOrFail('mlJobOpenCustomUrlFormButton', { timeout: 5000 });
    },

    async clickOpenCustomUrlEditor() {
      await this.ensureEditCustomUrlTabOpen();
      await testSubjects.click('mlJobOpenCustomUrlFormButton');
      await testSubjects.existOrFail('mlJobCustomUrlForm');
    },

    async clickIntervalTimeRangeSwitch() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry(
          'mlJobCustomUrlIntervalTimeRangeSwitch'
        );
      });
      await testSubjects.existOrFail('mlJobCustomUrlTimeRangeIntervalInput');
    },

    async getExistingCustomUrlCount(): Promise<number> {
      const existingCustomUrls = await testSubjects.findAll('mlJobEditCustomUrlItemLabel');
      return existingCustomUrls.length;
    },

    async saveCustomUrl(expectedLabel: string, expectedIndex: number, expectedValue?: string) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('mlJobAddCustomUrl');
        await customUrls.assertCustomUrlLabel(expectedIndex, expectedLabel);
      });

      if (expectedValue !== undefined) {
        await customUrls.assertCustomUrlUrlValue(expectedIndex, expectedValue);
      }
    },

    async fillInDiscoverUrlForm(customUrl: DiscoverUrlConfig, addTimerange: boolean = false) {
      await this.clickOpenCustomUrlEditor();
      await customUrls.setCustomUrlLabel(customUrl.label);
      await mlCommonUI.selectRadioGroupValue(
        `mlJobCustomUrlLinkToTypeInput`,
        URL_TYPE.KIBANA_DISCOVER
      );
      await mlCommonUI.selectSelectValueByVisibleText(
        'mlJobCustomUrlDiscoverIndexPatternInput',
        customUrl.indexName
      );
      await customUrls.setCustomUrlQueryEntityFieldNames(customUrl.queryEntityFieldNames);
      if (addTimerange) {
        await mlCommonUI.selectSelectValueByVisibleText(
          'mlJobCustomUrlTimeRangeInput',
          customUrl.timeRange
        );
      }
      if (customUrl.timeRange === TIME_RANGE_TYPE.INTERVAL) {
        await customUrls.setCustomUrlTimeRangeInterval(customUrl.timeRangeInterval!);
      }
    },

    async fillInDashboardUrlForm(customUrl: DashboardUrlConfig) {
      await this.clickOpenCustomUrlEditor();
      await customUrls.setCustomUrlLabel(customUrl.label);
      await mlCommonUI.selectRadioGroupValue(
        'mlJobCustomUrlLinkToTypeInput',
        URL_TYPE.KIBANA_DASHBOARD
      );
      await mlCommonUI.selectSelectValueByVisibleText(
        'mlJobCustomUrlDashboardNameInput',
        customUrl.dashboardName
      );

      await customUrls.setCustomUrlQueryEntityFieldNames(customUrl.queryEntityFieldNames);
      if (customUrl.timeRange === TIME_RANGE_TYPE.INTERVAL) {
        await this.clickIntervalTimeRangeSwitch();
        await customUrls.setCustomUrlTimeRangeInterval(customUrl.timeRangeInterval!);
      }
    },

    async fillInOtherUrlForm(customUrl: OtherUrlConfig) {
      await this.clickOpenCustomUrlEditor();
      await customUrls.setCustomUrlLabel(customUrl.label);
      await mlCommonUI.selectRadioGroupValue('mlJobCustomUrlLinkToTypeInput', URL_TYPE.OTHER);
      await customUrls.setCustomUrlOtherTypeUrl(customUrl.url);
    },

    async addDashboardCustomUrl(
      jobId: string,
      customUrl: DashboardUrlConfig,
      expectedResult: { index: number; url: string }
    ) {
      await this.openEditCustomUrlsForJobTab(jobId);

      await retry.tryForTime(30 * 1000, async () => {
        await this.fillInDashboardUrlForm(customUrl);
      });
      await this.saveCustomUrl(customUrl.label, expectedResult.index, expectedResult.url);
      await this.updateAnalyticsJob();
    },

    async addDiscoverCustomUrl(jobId: string, customUrl: DiscoverUrlConfig) {
      await this.openEditCustomUrlsForJobTab(jobId);

      await retry.tryForTime(30 * 1000, async () => {
        const existingCustomUrlCount = await this.getExistingCustomUrlCount();

        await this.fillInDiscoverUrlForm(customUrl);
        await this.saveCustomUrl(customUrl.label, existingCustomUrlCount);
      });

      await this.updateAnalyticsJob();
    },

    async addOtherTypeCustomUrl(jobId: string, customUrl: OtherUrlConfig) {
      await this.openEditCustomUrlsForJobTab(jobId);

      await retry.tryForTime(30 * 1000, async () => {
        const existingCustomUrlCount = await this.getExistingCustomUrlCount();

        await this.fillInOtherUrlForm(customUrl);
        await this.saveCustomUrl(customUrl.label, existingCustomUrlCount);
      });

      await this.updateAnalyticsJob();
    },

    async testOtherTypeCustomUrlAction(indexInList: number, expectedUrl: string) {
      await customUrls.assertCustomUrlUrlValue(indexInList, expectedUrl);
      await this.closeEditJobFlyout();
    },

    async editCustomUrl(indexInList: number, customUrl: { label: string; url: string }) {
      await customUrls.editCustomUrlLabel(indexInList, customUrl.label);
      await customUrls.editCustomUrlUrlValue(indexInList, customUrl.url);
    },

    async deleteCustomUrl(jobId: string, indexInList: number) {
      const beforeCustomUrls = await testSubjects.findAll('mlJobEditCustomUrlItemLabel');
      await customUrls.deleteCustomUrl(indexInList);
      return beforeCustomUrls.length;
    },

    async assertCustomUrlsLength(expectedLength: number) {
      await customUrls.assertCustomUrlsLength(expectedLength);
      await this.closeEditJobFlyout();
    },

    async openTestCustomUrl(jobId: string, indexInList: number) {
      await this.openEditCustomUrlsForJobTab(jobId);
      await customUrls.clickTestCustomUrl(indexInList);
    },

    async testDiscoverCustomUrlAction(expectedHitCountFormatted?: string) {
      await customUrls.assertDiscoverCustomUrlAction(expectedHitCountFormatted);
    },

    async testDashboardCustomUrlAction(expectedPanelCount: number) {
      await customUrls.assertDashboardCustomUrlAction(expectedPanelCount);
    },

    async closeEditJobFlyout() {
      if (await testSubjects.exists('mlAnalyticsEditFlyoutCancelButton')) {
        await testSubjects.click('mlAnalyticsEditFlyoutCancelButton');
        await this.assertAnalyticsEditFlyoutMissing();
      }
    },

    async assertJobDescriptionEditInputExists() {
      await testSubjects.existOrFail('mlAnalyticsEditFlyoutDescriptionInput');
    },
    async assertJobDescriptionEditValue(expectedValue: string) {
      const actualJobDescription = await testSubjects.getAttribute(
        'mlAnalyticsEditFlyoutDescriptionInput',
        'value'
      );
      expect(actualJobDescription).to.eql(
        expectedValue,
        `Job description edit should be '${expectedValue}' (got '${actualJobDescription}')`
      );
    },
    async assertJobMmlEditInputExists() {
      await testSubjects.existOrFail('mlAnalyticsEditFlyoutmodelMemoryLimitInput');
    },
    async assertJobMmlEditValue(expectedValue: string) {
      const actualMml = await testSubjects.getAttribute(
        'mlAnalyticsEditFlyoutmodelMemoryLimitInput',
        'value'
      );
      expect(actualMml).to.eql(
        expectedValue,
        `Job model memory limit edit should be '${expectedValue}' (got '${actualMml}')`
      );
    },
    async setJobDescriptionEdit(jobDescription: string) {
      await mlCommonUI.setValueWithChecks('mlAnalyticsEditFlyoutDescriptionInput', jobDescription, {
        clearWithKeyboard: true,
      });
      await this.assertJobDescriptionEditValue(jobDescription);
    },

    async setJobMmlEdit(mml: string) {
      await mlCommonUI.setValueWithChecks('mlAnalyticsEditFlyoutmodelMemoryLimitInput', mml, {
        clearWithKeyboard: true,
      });
      await this.assertJobMmlEditValue(mml);
    },

    async assertAnalyticsEditFlyoutMissing() {
      await testSubjects.missingOrFail('mlAnalyticsEditFlyout');
    },

    async updateAnalyticsJob() {
      await testSubjects.existOrFail('mlAnalyticsEditFlyoutUpdateButton');
      await testSubjects.click('mlAnalyticsEditFlyoutUpdateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertAnalyticsEditFlyoutMissing();
      });
    },
  };
}

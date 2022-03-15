/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '@elastic/synthetics';
import { byTestId, delay } from '../journeys/utils';
import { monitorManagementPageProvider } from './monitor_management';

interface AlertType {
  id: string;
  threshold: string;
}

export function monitorDetailsPageProvider({ page, kibanaUrl }: { page: Page; kibanaUrl: string }) {
  return {
    ...monitorManagementPageProvider({ page, kibanaUrl }),

    async navigateToMonitorDetails(monitorId: string) {
      await page.click(byTestId(`monitor-page-link-${monitorId}`));
    },

    async selectFilterItem(filterType: string, itemArg: string | string[]) {
      const itemList = Array.isArray(itemArg) ? itemArg : [itemArg];
      await page.click(`[aria-label="expands filter group for ${filterType} filter"]`);
      await this.clickFilterItems(itemList);
      return this.applyFilterItems(filterType);
    },

    async clickFilterItems(itemList: string[]) {
      for (const title of itemList) {
        await page.click(`li[title="${title}"]`);
      }
    },

    async applyFilterItems(filterType: string) {
      await page.click(`[aria-label="Apply the selected filters for ${filterType}"]`);
    },

    async setStatusFilterUp() {
      await page.click('[data-test-subj="xpack.uptime.filterBar.filterStatusUp"]');
    },

    async setStatusFilterDown() {
      await page.click('[data-test-subj="xpack.uptime.filterBar.filterStatusDown"]');
    },

    async refreshFromES() {
      await this.byTestId('superDatePickerApplyTimeButton');
    },

    async enableAnomalyDetection() {
      await page.click(byTestId('uptimeEnableAnomalyBtn'));
    },

    async getMonitorRedirects() {
      return await page.textContent(byTestId('uptimeMonitorRedirectInfo'));
    },

    async expandPingDetails() {
      await page.click(byTestId('uptimePingListExpandBtn'));
    },

    async ensureAnomalyDetectionFlyoutIsOpen() {
      await page.waitForSelector(byTestId('uptimeMLFlyout'));
    },

    async isMLMenuVisible() {
      return await page.isVisible(byTestId('uptimeManageMLContextMenu'), {
        timeout: 3000,
      });
    },

    async canCreateJob(): Promise<boolean> {
      await this.ensureAnomalyDetectionFlyoutIsOpen();
      const createJobBtn = await page.$(byTestId('uptimeMLCreateJobBtn'));
      return await createJobBtn!.isEnabled();
    },

    async openAnomalyDetectionMenu() {
      const visible = await this.isMLMenuVisible();
      if (visible === false) {
        await page.click(byTestId('uptimeManageMLJobBtn'), { timeout: 5000 });
      }
    },

    async closeAnomalyDetectionMenu() {
      if ((await this.isMLMenuVisible()) === true) {
        await page.click(byTestId('uptimeManageMLJobBtn'), { timeout: 5000 });
      }
    },

    async waitAndRefresh(timeout?: number) {
      await delay(timeout ?? 1000);
      await this.refreshFromES();
      await this.waitForLoadingToFinish();
    },

    async updateAlert({ id, threshold }: AlertType) {
      await this.fillByTestSubj('ruleNameInput', id);
      await this.selectAlertThreshold(threshold);
    },

    async selectAlertThreshold(threshold: string) {
      await this.clickByTestSubj('uptimeAnomalySeverity');
      await this.clickByTestSubj('anomalySeveritySelect');
      await page.click(`text=${threshold}`);
    },

    async disableAnomalyDetection() {
      await this.openAnomalyDetectionMenu();
      await page.click(byTestId('uptimeDeleteMLJobBtn'), { timeout: 10000 });
      await page.click(byTestId('confirmModalConfirmButton'));
      await page.waitForSelector('text=Job deleted');
      await this.closeAnomalyDetectionMenu();
    },

    async disableAnomalyDetectionAlert() {
      await this.openAnomalyDetectionMenu();
      await page.click(byTestId('uptimeManageAnomalyAlertBtn'), { timeout: 10000 });
      await page.click(byTestId('uptimeDisableAnomalyAlertBtn'));
      await page.click(byTestId('confirmModalConfirmButton'));
      await page.waitForSelector('text=Rule successfully disabled!');
      await this.closeAnomalyDetectionMenu();
    },
  };
}

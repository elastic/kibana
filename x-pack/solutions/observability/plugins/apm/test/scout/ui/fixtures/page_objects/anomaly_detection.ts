/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EuiComboBoxWrapper } from '@kbn/scout-oblt';

export class AnomalyDetectionPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/settings/anomaly-detection`);
    await this.page.waitForLoadingIndicatorHidden();

    // Wait for the page content to load
    this.page.getByRole('heading', { name: 'Settings', level: 1 });

    return this.page;
  }

  async getCreateJobButton() {
    return this.page.testSubj.locator('apmJobsListCreateJobButton');
  }

  getCreateJobButtonLocator() {
    return this.page.testSubj.locator('apmJobsListCreateJobButton');
  }

  async clickCreateJobButton() {
    const button = this.getCreateJobButtonLocator();
    await button.click();
  }

  async clickEnvironmentComboBox() {
    await this.page.getByPlaceholder('Select or add environments').click();
  }

  async selectEnvironment(environmentName: string) {
    const environmentComboBox = new EuiComboBoxWrapper(this.page, { locator: '.euiComboBox' });
    await environmentComboBox.setCustomMultiOption(environmentName);
  }

  async clickCreateJobsButton() {
    await this.page.testSubj.locator('apmAddEnvironmentsCreateJobsButton').click();
  }

  async createMlJobs(environmentName: string) {
    await this.clickCreateJobButton();
    await this.clickEnvironmentComboBox();
    await this.selectEnvironment(environmentName);
    await this.clickCreateJobsButton();

    this.page.getByText('Anomaly detection jobs created');
  }
}

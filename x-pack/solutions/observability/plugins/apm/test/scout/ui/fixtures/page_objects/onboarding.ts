/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export class OnboardingPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/onboarding`);
    await this.page
      .getByText('APM Agents')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async selectAgent(name: string) {
    await this.page.getByRole('tab', { name, exact: true }).click();
  }

  public get checkAgentStatusButton() {
    return this.page.getByTestId('checkAgentStatus');
  }

  public get createApiKeyButton() {
    return this.page.getByTestId('createApiKeyAndId');
  }

  getCallout(testSubj: string) {
    return this.page.getByTestId(testSubj);
  }
}

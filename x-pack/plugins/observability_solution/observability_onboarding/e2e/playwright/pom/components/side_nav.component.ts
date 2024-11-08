/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '@playwright/test';

export class SideNav {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async goto() {
    await this.page.goto('/');
  }

  private readonly toggleNavButton = () => this.page.getByTestId('toggleNavButton');
  private readonly homeLink = () => this.page.getByTestId('homeLink');
  private readonly discover = () => this.page.locator('xpath=//span[@title="Discover"]');
  private readonly dashboards = () =>
    this.page.locator(
      'xpath=//div[@class="euiFlyoutBody__overflowContent"]//*[contains(text(),"Dashboards")]'
    );
  private readonly observability = () =>
    this.page.locator(
      'xpath=//span[contains(@class,"euiAccordion__buttonContent")]//a[contains(text(),"Observability")]'
    );
  private readonly observabilitySolutionLink = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="homSolutionPanel homSolutionPanel_observability"]//a[contains(text(),"Observability")]'
    );
  private readonly apm = () => this.page.getByRole('link', { name: 'APM' });
  private readonly alerts = () =>
    this.page.getByTestId('observability-nav-observability-overview-alerts');
  private readonly infrastructure = () => this.page.getByRole('link', { name: 'Infrastructure' });
  private readonly stackManagement = () =>
    this.page.locator('xpath=//span[@title="Stack Management"]');

  public async clicktoggleNavButton() {
    await this.toggleNavButton().click();
  }

  public async clickhomeLink() {
    await this.homeLink().click();
  }

  public async clickDiscover() {
    await this.discover().click();
  }

  public async clickDashboards() {
    await this.dashboards().click();
  }

  public async clickAlerts() {
    await this.alerts().click();
  }

  public async clickObservability() {
    await this.observability().click();
  }

  public async clickAPM() {
    await this.apm().click();
  }

  public async clickInfrastructure() {
    await this.infrastructure().click();
  }

  public async clickStackManagement() {
    await this.stackManagement().click();
  }

  public async clickObservabilitySolutionLink() {
    await this.observabilitySolutionLink().click();
  }
}

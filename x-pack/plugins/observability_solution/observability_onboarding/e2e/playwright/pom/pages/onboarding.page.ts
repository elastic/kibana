/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@playwright/test';

export class OnboardingPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public readonly useCaseHost = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="observabilityOnboardingUseCaseCard-host"]//input[@type="radio"]'
    );
  public readonly useCaseLogs = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="observabilityOnboardingUseCaseCard-logs"]//input[@type="radio"]'
    );
  private readonly useCaseKubernetes = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="observabilityOnboardingUseCaseCard-kubernetes"]//input[@type="radio"]'
    );
  private readonly useCaseInfra = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="observabilityOnboardingUseCaseCard-infra"]//input[@type="radio"]'
    );
  public readonly autoDetectElasticAgent = () =>
    this.page.getByTestId('integration-card:auto-detect-logs');
  public readonly streamHostLogs = () => this.page.getByTestId('integration-card:system-logs');
  private readonly kubernetes = () =>
    this.page.locator('xpath=//button[contains(text(), "Kubernetes")]');
  private readonly kubernetesElasticAgent = () =>
    this.page.getByTestId('integration-card:kubernetes-quick-start');
  public readonly contentNotLoaded = () =>
    this.page.locator('xpath=//h2[contains(text(),"Unable to load content")]');
  private readonly retryButton = () =>
    this.page.getByTestId('observabilityOnboardingAutoDetectPanelGoBackButton');
  public readonly codeBlock = () => this.page.locator('xpath=//code[@data-code-language="text"]');
  public readonly codeBash = () => this.page.locator('xpath=//code[@data-code-language="bash"]');
  private readonly systemIntegrationInstalled = () =>
    this.page.locator('xpath=//*[contains(text(), "System integration installed.")]');
  private readonly apiKeyCreated = () =>
    this.page.locator('xpath=//*[contains(text(), "API Key created.")]');
  private readonly autoDownloadConfigButton = () =>
    this.page.locator(
      'xpath=//button[@data-test-subj="obltOnboardingInstallElasticAgentAutoDownloadConfig"]'
    );
  private readonly copyToClipboardButtonCode = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="obltOnboardingInstallElasticAgentStep"]//button[@data-test-subj="euiCodeBlockCopy"]'
    );
  private readonly copyToClipboardButton = () =>
    this.page.getByTestId('observabilityOnboardingCopyToClipboardButton');
  private readonly receivedDataIndicator = () =>
    this.page.locator('xpath=//div[contains(text(), "Your data is ready to explore!")]');
  private readonly logsShipped = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="obltOnboardingCheckLogsStep"]//*[contains(text(), "Logs are being shipped!")]'
    );
  private readonly actionLinkSystem = () =>
    this.page.locator(
      'xpath=//a[contains(@data-test-subj, "observabilityOnboardingDataIngestStatusActionLink-system")]'
    );
  private readonly errorFetchingResource = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="globalToastList"]//*[text()="Error while fetching resource"]'
    );
  private readonly autoDetectSystemIntegrationActionLink = () =>
    this.page.locator(
      'xpath=//a[@data-test-subj="observabilityOnboardingDataIngestStatusActionLink-inventory-host-details"]'
    );

  public async selectCollectLogs() {
    await this.useCaseLogs().click();
  }

  public async selectHost() {
    await this.useCaseHost().click();
  }

  public async selectStreamLogs() {
    await this.streamHostLogs().click();
  }

  public async selectAutoDetectWithElasticAgent() {
    await this.autoDetectElasticAgent().click();
  }

  public async selectMonitorInfrastructure() {
    await this.useCaseInfra().click();
  }

  public async selectKubernetes() {
    await this.useCaseKubernetes().click();
  }

  public async selectKubernetesOption() {
    await this.kubernetes().click();
  }

  public async selectKubernetesWithElasticAgent() {
    await this.kubernetesElasticAgent().click();
  }

  public async clickRetry() {
    await this.retryButton().click();
  }

  public async clickAutoDownloadConfigButton() {
    await this.autoDownloadConfigButton().click();
  }

  public async copyToClipboardCode() {
    await this.copyToClipboardButtonCode().click();
  }

  public async copyToClipboard() {
    await this.copyToClipboardButton().click();
  }

  public async exploreMetricsSystem() {
    await this.actionLinkSystem().click();
  }

  public async assertSystemIntegrationInstalled() {
    await expect(
      this.systemIntegrationInstalled(),
      '"System Integration installed" indicator should be visible'
    ).toBeVisible();
  }

  public async assertApiKeyCreated() {
    await expect(
      this.apiKeyCreated(),
      '"API key created" indicator should be visible'
    ).toBeVisible();
  }

  public async assertVisibilityCodeBlock() {
    await expect(this.codeBlock(), 'Code block should be visible').toBeVisible();
  }

  public async assertVisibilityCodeBash() {
    await expect(this.codeBash(), 'Code block should be visible').toBeVisible();
  }

  public async assertReceivedDataIndicator() {
    await expect(
      this.receivedDataIndicator(),
      'Received data indicator should be visible'
    ).toBeVisible();
  }

  public async assertShippedLogs() {
    await expect(this.logsShipped(), 'Received data indicator should be visible').toBeVisible();
  }

  public async assertErrorFetchingResource() {
    await expect(this.errorFetchingResource(), 'Error while fetching resource').toBeVisible();
  }

  public async clickAutoDetectSystemIntegrationCTA() {
    await this.autoDetectSystemIntegrationActionLink().click();
  }
}

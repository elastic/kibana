/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, Locator } from '@kbn/scout';

export class CustomLogsPage {
  public advancedSettingsContent: Locator;
  public logFilePathList: Locator;
  public addLogFilePathButton: Locator;
  public integrationNameInput: Locator;
  public datasetNameInput: Locator;
  public serviceNameInput: Locator;
  public namespaceInput: Locator;
  public customConfigInput: Locator;
  public customIntegrationInstalledCallout: Locator;
  public customIntegrationErrorCallout: Locator;
  public apiKeyCreatedCallout: Locator;
  public apiKeyPrivilegesErrorCallout: Locator;
  public apiKeyCreateErrorCallout: Locator;
  public autoDownloadConfigurationToggle: Locator;
  public autoDownloadConfigurationCallout: Locator;
  public installCodeSnippet: Locator;
  public windowsInstallElasticAgentDocLink: Locator;
  public configureElasticAgentStep: Locator;
  public downloadConfigurationButton: Locator;
  public continueButton: Locator;
  public exploreLogsButton: Locator;
  public checkLogsStepMessage: Locator;

  constructor(private readonly page: ScoutPage) {
    this.advancedSettingsContent = this.page.testSubj
      .locator('obltOnboardingCustomLogsAdvancedSettings')
      .getByRole('group');
    this.logFilePathList = this.page.locator(`[data-test-subj^=obltOnboardingLogFilePath-]`);
    this.addLogFilePathButton = this.page.testSubj.locator('obltOnboardingCustomLogsAddFilePath');
    this.integrationNameInput = this.page.testSubj.locator(
      'obltOnboardingCustomLogsIntegrationsName'
    );
    this.datasetNameInput = this.page.testSubj.locator('obltOnboardingCustomLogsDatasetName');
    this.serviceNameInput = this.page.testSubj.locator('obltOnboardingCustomLogsServiceName');
    this.namespaceInput = this.page.testSubj.locator('obltOnboardingCustomLogsNamespace');

    this.continueButton = page.testSubj.locator('obltOnboardingCustomLogsContinue');

    this.customConfigInput = this.page.testSubj.locator('obltOnboardingCustomLogsCustomConfig');
    this.customIntegrationInstalledCallout = this.page.testSubj.locator(
      'obltOnboardingCustomIntegrationInstalled'
    );
    this.customIntegrationErrorCallout = this.page.testSubj.locator(
      'obltOnboardingCustomIntegrationErrorCallout'
    );
    this.apiKeyCreatedCallout = this.page.testSubj.locator('obltOnboardingLogsApiKeyCreated');
    this.apiKeyPrivilegesErrorCallout = this.page.testSubj.locator(
      'obltOnboardingLogsApiKeyCreationNoPrivileges'
    );
    this.apiKeyCreateErrorCallout = this.page.testSubj.locator(
      'obltOnboardingLogsApiKeyCreationFailed'
    );
    this.autoDownloadConfigurationToggle = this.page.testSubj.locator(
      'obltOnboardingInstallElasticAgentAutoDownloadConfig'
    );
    this.autoDownloadConfigurationCallout = this.page.testSubj.locator(
      'obltOnboardingInstallElasticAgentAutoDownloadConfigCallout'
    );
    this.installCodeSnippet = this.page.testSubj
      .locator('obltOnboardingInstallElasticAgentStep')
      .getByRole('code');
    this.windowsInstallElasticAgentDocLink = this.page.testSubj.locator(
      'obltOnboardingInstallElasticAgentWindowsDocsLink'
    );
    this.configureElasticAgentStep = this.page.testSubj.locator(
      'obltOnboardingConfigureElasticAgentStep'
    );
    this.downloadConfigurationButton = this.page.testSubj.locator(
      'obltOnboardingConfigureElasticAgentStepDownloadConfig'
    );

    this.exploreLogsButton = this.page.testSubj.locator('obltOnboardingExploreLogs');
    this.checkLogsStepMessage = this.page.testSubj
      .locator('obltOnboardingCheckLogsStep')
      .locator(`.euiStep__title`);
  }

  async goto() {
    return this.page.gotoApp('observabilityOnboarding/customLogs');
  }

  async clickBackButton() {
    return this.page.testSubj.click('observabilityOnboardingFlowBackToSelectionButton');
  }

  getLogFilePathInputField(index: number) {
    return this.page.testSubj.locator(`obltOnboardingLogFilePath-${index}`).getByRole('textbox');
  }

  logFilePathDeleteButton(index: number) {
    return this.page.testSubj.locator(`obltOnboardingLogFilePathDelete-${index}`);
  }

  async clickAdvancedSettingsButton() {
    return this.page.testSubj
      .locator('obltOnboardingCustomLogsAdvancedSettings')
      .locator('button.euiAccordion__button')
      .click();
  }

  getStepStatusLocator(status: 'loading' | 'complete' | 'danger' | 'warning') {
    return this.page.testSubj.locator(`obltOnboardingStepStatus-${status}`);
  }

  async selectPlatform(name: 'linux' | 'macos' | 'windows') {
    return this.page.testSubj.click(name);
  }

  getCheckLogsStepLocator(status: 'loading' | 'incomplete' | 'complete') {
    return this.page.testSubj
      .locator('obltOnboardingCheckLogsStep')
      .locator(`.euiStep__titleWrapper [class$="euiStepNumber-s-${status}"]`);
  }
}

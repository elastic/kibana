/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ADD_INTEGRATION_POLICY_BTN = 'addIntegrationPolicyButton';
export const CREATE_PACKAGE_POLICY_SAVE_BTN = 'createPackagePolicySaveButton';

export const INTEGRATION_NAME_LINK = 'integrationNameLink';
export const AGENT_POLICY_NAME_LINK = 'agentPolicyNameLink';
export const AGENT_ACTIONS_BTN = 'agentActionsBtn';

export const FLYOUT_CLOSE_BTN_SEL = '[data-test-subj="euiFlyoutCloseButton"]';

export const SETTINGS_TAB = 'tab-settings';
export const POLICIES_TAB = 'tab-policies';
export const ADVANCED_TAB = 'tab-custom';

export const UPDATE_PACKAGE_BTN = 'updatePackageBtn';
export const LATEST_VERSION = 'epmSettings.latestVersionTitle';
export const INSTALLED_VERSION = 'epmSettings.installedVersionTitle';

export const PACKAGE_VERSION = 'packageVersionText';
export const INTEGRATION_LIST = 'epmList.integrationCards';
export const INTEGRATIONS_SEARCHBAR = {
  INPUT: 'epmList.searchBar',
  BADGE: 'epmList.categoryBadge',
  REMOVE_BADGE_BUTTON: 'epmList.categoryBadge.closeBtn',
};

export const SETTINGS = {
  INSTALL_ASSETS_BTN: 'installAssetsButton',
  UNINSTALL_ASSETS_BTN: 'uninstallAssetsButton',
};

export const POLICY_EDITOR = {
  POLICY_NAME_INPUT: 'packagePolicyNameInput',
  DATASET_SELECT: 'datasetComboBox',
  AGENT_POLICY_SELECT: 'agentPolicyMultiSelect',
  INSPECT_PIPELINES_BTN: 'datastreamInspectPipelineBtn',
  EDIT_MAPPINGS_BTN: 'datastreamEditMappingsBtn',
  CREATE_MAPPINGS_BTN: 'datastreamAddCustomComponentTemplateBtn',
};

export const INTEGRATION_POLICIES_UPGRADE_CHECKBOX = 'epmDetails.upgradePoliciesCheckbox';

export const getIntegrationCard = (integration: string) => `integration-card:epr:${integration}`;
export const getIntegrationCategories = (category: string) => `epmList.categories.${category}`;

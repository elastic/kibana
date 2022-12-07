/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ADD_AGENT_BUTTON = 'addAgentButton';
export const ADD_AGENT_BUTTON_TOP = 'addAgentBtnTop';
export const LANDING_PAGE_ADD_FLEET_SERVER_BUTTON = 'fleetServerLanding.addFleetServerButton';

export const AGENTS_TAB = 'fleet-agents-tab';
export const AGENT_POLICIES_TAB = 'fleet-agent-policies-tab';
export const ENROLLMENT_TOKENS_TAB = 'fleet-enrollment-tokens-tab';
export const DATA_STREAMS_TAB = 'fleet-datastreams-tab';
export const SETTINGS_TAB = 'fleet-settings-tab';

export const MISSING_PRIVILEGES_TITLE = 'missingPrivilegesPromptTitle';
export const MISSING_PRIVILEGES_MESSAGE = 'missingPrivilegesPromptMessage';
export const FLEET_SERVER_MISSING_PRIVILEGES_MESSAGE = 'fleetServerMissingPrivilegesMessage';
export const FLEET_SERVER_MISSING_PRIVILEGES_TITLE = 'fleetServerMissingPrivilegesTitle';
export const AGENT_POLICY_SAVE_INTEGRATION = 'saveIntegration';
export const PACKAGE_POLICY_TABLE_LINK = 'PackagePoliciesTableLink';
export const ADD_PACKAGE_POLICY_BTN = 'addPackagePolicyButton';
export const GENERATE_FLEET_SERVER_POLICY_BUTTON = 'generateFleetServerPolicyButton';
export const ADD_FLEET_SERVER_HEADER = 'addFleetServerHeader';

export const PLATFORM_TYPE_LINUX_BUTTON = 'platformTypeLinux';
export const ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON = 'fleetServerAddHostBtn';
export const ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON =
  'fleetServerGenerateServiceTokenBtn';

export const CREATE_FLEET_SERVER_POLICY_BTN = 'createFleetServerPolicyBtn';

export const AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD = 'createAgentPolicyNameField';
export const AGENT_POLICIES_FLYOUT_ADVANCED_DEFAULT_NAMESPACE_HEADER = 'defaultNamespaceHeader';
export const AGENT_POLICY_FLYOUT_CREATE_BUTTON = 'createAgentPolicyFlyoutBtn';

export const ENROLLMENT_TOKENS = {
  CREATE_TOKEN_BUTTON: 'createEnrollmentTokenButton',
  CREATE_TOKEN_MODAL_NAME_FIELD: 'createEnrollmentTokenNameField',
  CREATE_TOKEN_MODAL_SELECT_FIELD: 'createEnrollmentTokenSelectField',
  LIST_TABLE: 'enrollmentTokenListTable',
  TABLE_REVOKE_BTN: 'enrollmentTokenTable.revokeBtn',
};
export const SETTINGS_FLEET_SERVER_HOST_HEADING = 'fleetServerHostHeader';
export const SETTINGS_SAVE_BTN = 'saveApplySettingsBtn';

export const AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX = 'agentPolicyFormSystemMonitoringCheckbox';
export const INSTALL_INTEGRATIONS_ADVANCE_OPTIONS_BTN = 'AgentPolicyAdvancedOptions.AccordionBtn';
export const AGENT_POLICY_CREATE_STATUS_CALLOUT = 'agentPolicyCreateStatusCallOut';

export const EXISTING_HOSTS_TAB = 'existingHostsTab';
export const NEW_HOSTS_TAB = 'newHostsTab';

export const CURRENT_BULK_UPGRADES_CALLOUT = {
  ABORT_BTN: 'currentBulkUpgrade.abortBtn',
};

export const AGENT_FLYOUT = {
  CREATE_POLICY_BUTTON: 'createPolicyBtn',
  CLOSE_BUTTON: 'euiFlyoutCloseButton',
  POLICY_DROPDOWN: 'agentPolicyDropdown',
  QUICK_START_TAB_BUTTON: 'fleetServerFlyoutTab-quickStart',
  ADVANCED_TAB_BUTTON: 'fleetServerFlyoutTab-advanced',
  AGENT_POLICY_CODE_BLOCK: 'agentPolicyCodeBlock',
  STANDALONE_TAB: 'standaloneTab',
  CONFIRM_AGENT_ENROLLMENT_BUTTON: 'ConfirmAgentEnrollmentButton',
  INCOMING_DATA_CONFIRMED_CALL_OUT: 'IncomingDataConfirmedCallOut',
};

export const AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT = {
  TITLE: 'createAgentPolicyFlyoutTitle',
  CREATE_BUTTON: 'createAgentPolicyButton',
  COLLECT_LOGS_CHECKBOX: 'collectLogsCheckbox',
  COLLECT_METRICS_CHECKBOX: 'collectMetricsCheckbox',
};

export const AGENT_BINARY_SOURCES_TABLE = 'AgentDownloadSourcesTable';
export const AGENT_BINARY_SOURCES_TABLE_ACTIONS = {
  DEFAULT_VALUE: 'editDownloadSourceTable.defaultIcon',
  HOST: 'editDownloadSourceTable.host',
  ADD: 'addDownloadSourcesBtn',
  EDIT: 'editDownloadSourceTable.edit.btn',
  DELETE: 'editDownloadSourceTable.delete.btn',
  DEFAULT_ICON: 'editDownloadSourceTable.defaultIcon',
  HOST_NAME: 'editDownloadSourceTable.host',
};
export const AGENT_BINARY_SOURCES_FLYOUT = {
  NAME_INPUT: 'editDownloadSourcesFlyout.nameInput',
  HOST_INPUT: 'editDownloadSourcesFlyout.hostInput',
  IS_DEFAULT_SWITCH: 'editDownloadSourcesFlyout.isDefaultSwitch',
  SUBMIT_BUTTON: 'editDownloadSourcesFlyout.submitBtn',
  CANCEL_BUTTON: 'editDownloadSourcesFlyout.cancelBtn',
};

export const SETTINGS_OUTPUTS = {
  EDIT_BTN: 'editOutputBtn',
  ADD_BTN: 'addOutputBtn',
  NAME_INPUT: 'settingsOutputsFlyout.nameInput',
  TYPE_INPUT: 'settingsOutputsFlyout.typeInput',
};

export const SETTINGS_FLEET_SERVER_HOSTS = {
  ADD_BUTTON: 'settings.fleetServerHosts.addFleetServerHostBtn',
  EDIT_BUTTON: 'fleetServerHostsTable.edit.btn',
};

export const AGENT_POLICY_FORM = {
  DOWNLOAD_SOURCE_SELECT: 'agentPolicyForm.downloadSource.select',
};

export const FLEET_AGENT_LIST_PAGE = {
  TABLE: 'fleetAgentListTable',
  STATUS_FILTER: 'agentList.statusFilter',
  POLICY_FILTER: 'agentList.policyFilter',
  QUERY_INPUT: 'agentList.queryInput',
  SHOW_UPGRADEABLE: 'agentList.showUpgradeable',
  CHECKBOX_SELECT_ALL: 'checkboxSelectAll',
  BULK_ACTIONS_BUTTON: 'agentBulkActionsButton',
};

export const FLEET_SERVER_HOST_FLYOUT = {
  NAME_INPUT: 'fleetServerHostsFlyout.nameInput',
  DEFAULT_SWITCH: 'fleetServerHostsFlyout.isDefaultSwitch',
};

export const FLEET_SERVER_SETUP = {
  NAME_INPUT: 'fleetServerSetup.nameInput',
  HOST_INPUT: 'fleetServerSetup.multiRowInput',
  DEFAULT_SWITCH: 'fleetServerHostsFlyout.isDefaultSwitch',
  ADD_HOST_BTN: 'fleetServerSetup.addNewHostBtn',
  SELECT_HOSTS: 'fleetServerSetup.fleetServerHostsSelect',
};

export const API_KEYS = {
  REVOKE_KEY_BUTTON: 'enrollmentTokenTable.revokeBtn',
};

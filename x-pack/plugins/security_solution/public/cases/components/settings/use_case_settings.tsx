/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseSettingsRegistry } from './types';
import { createCaseSettingsRegistry } from './settings_registry';
import { getCaseSetting as getJiraCaseSetting, JiraSettingFields } from './jira';
import { getCaseSetting as getResilientCaseSetting, ResilientSettingFields } from './resilient';
import { getCaseSetting as getServiceNowCaseSetting, ServiceNowSettingFields } from './servicenow';

interface UseCaseSettingReturn {
  caseSettingsRegistry: CaseSettingsRegistry;
}

function registerCaseSettings(caseSettingsRegistry: CaseSettingsRegistry) {
  caseSettingsRegistry.register<JiraSettingFields>(getJiraCaseSetting());
  caseSettingsRegistry.register<ResilientSettingFields>(getResilientCaseSetting());
  caseSettingsRegistry.register<ServiceNowSettingFields>(getServiceNowCaseSetting());
}

const caseSettingsRegistry = createCaseSettingsRegistry();
registerCaseSettings(caseSettingsRegistry);

export const useCaseSettings = (): UseCaseSettingReturn => {
  return {
    caseSettingsRegistry,
  };
};

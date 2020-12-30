/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseSettingsRegistry } from './types';
import { createCaseSettingsRegistry } from './settings_registry';
import { getCaseSetting as getJiraCaseSetting } from './jira';
import { getCaseSetting as getResilientCaseSetting } from './resilient';
import { getCaseSetting as getServiceNowCaseSetting } from './servicenow';
import {
  JiraFieldsType,
  ServiceNowFieldsType,
  ResilientFieldsType,
} from '../../../../../case/common/api/connectors';

interface GetCaseSettingReturn {
  caseSettingsRegistry: CaseSettingsRegistry;
}

class CaseSettings {
  private caseSettingsRegistry: CaseSettingsRegistry;

  constructor() {
    this.caseSettingsRegistry = createCaseSettingsRegistry();
    this.init();
  }

  private init() {
    this.caseSettingsRegistry.register<JiraFieldsType>(getJiraCaseSetting());
    this.caseSettingsRegistry.register<ResilientFieldsType>(getResilientCaseSetting());
    this.caseSettingsRegistry.register<ServiceNowFieldsType>(getServiceNowCaseSetting());
  }

  registry(): CaseSettingsRegistry {
    return this.caseSettingsRegistry;
  }
}

const caseSettings = new CaseSettings();

export const getCaseSettings = (): GetCaseSettingReturn => {
  return {
    caseSettingsRegistry: caseSettings.registry(),
  };
};

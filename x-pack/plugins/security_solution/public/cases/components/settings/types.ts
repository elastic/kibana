/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ActionConnector } from '../../../../../case/common/api';
import { JiraSettingFields } from './jira';
import { ResilientSettingFields } from './resilient';
import { ServiceNowSettingFields } from './servicenow';

export type CaseSettingsConnector = ActionConnector;

export interface CaseSetting<UIProps = unknown> {
  id: string;
  caseSettingFieldsComponent: React.LazyExoticComponent<
    React.ComponentType<SettingFieldsProps<UIProps>>
  > | null;
}

export type AllSettingFields = JiraSettingFields | ResilientSettingFields | ServiceNowSettingFields;

export interface CaseSettingsRegistry {
  has: (id: string) => boolean;
  register: <UIProps extends AllSettingFields>(setting: CaseSetting<UIProps>) => void;
  get: <UIProps extends AllSettingFields>(id: string) => CaseSetting<UIProps>;
  list: () => CaseSetting[];
}

export interface SettingFieldsProps<TFields> {
  fields?: TFields;
  connector: CaseSettingsConnector;
  onChange: (property: string, value: unknown) => void;
}

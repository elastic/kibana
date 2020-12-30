/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ActionConnector } from '../../../../../case/common/api';

import { ConnectorTypeFields } from '../../../../../case/common/api/connectors';
export type CaseSettingsConnector = ActionConnector;

export interface CaseSetting<UIProps = unknown> {
  id: string;
  caseSettingFieldsComponent: React.LazyExoticComponent<
    React.ComponentType<SettingFieldsProps<UIProps>>
  > | null;
}

export interface CaseSettingsRegistry {
  has: (id: string) => boolean;
  register: <UIProps extends ConnectorTypeFields['fields']>(setting: CaseSetting<UIProps>) => void;
  get: <UIProps extends ConnectorTypeFields['fields']>(id: string) => CaseSetting<UIProps>;
  list: () => CaseSetting[];
}

export interface SettingFieldsProps<TFields> {
  isEdit?: boolean;
  connector: CaseSettingsConnector;
  fields: TFields;
  onChange: (fields: TFields) => void;
}

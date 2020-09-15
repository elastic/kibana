/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CaseSetting {
  id: string;
}

export interface CaseSettingsRegistry {
  has: (id: string) => boolean;
  register: (setting: CaseSetting) => void;
  get: (id: string) => CaseSetting;
}

export interface CaseSettingConnector {
  id: string;
  actionTypeId: string;
  name: string;
}

export interface SettingFieldsProps<TFields> {
  fields: TFields;
  connector: CaseSettingConnector;
  onChange: (property: string, value: unknown) => void;
}

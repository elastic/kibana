/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Connector } from '../../../../../case/common/api';

export interface CaseSetting<UIProps = unknown> {
  id: string;
  caseSettingFieldsComponent: React.LazyExoticComponent<React.ComponentType<UIProps>> | null;
}

export interface CaseSettingsRegistry {
  has: (id: string) => boolean;
  register: (setting: CaseSetting) => void;
  get: (id: string) => CaseSetting;
  list: () => CaseSetting[];
}

export interface SettingFieldsProps<TFields> {
  fields: TFields;
  connector: Connector;
  onChange: (property: string, value: unknown) => void;
}

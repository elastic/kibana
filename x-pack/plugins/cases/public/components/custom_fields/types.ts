/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { EuiTableComputedColumnType } from '@elastic/eui';

import type { CustomFieldTypes } from '../../../common/types/domain';
import type {
  CasesConfigurationUICustomField,
  CaseUI,
  CaseUICustomField,
} from '../../containers/types';

export interface CustomFieldType<T extends CaseUICustomField, I = CasesConfigurationUICustomField> {
  Configure: React.FC;
  View: React.FC<{
    customField?: T;
    configuration?: I;
  }>;
  Edit: React.FC<{
    customField?: T;
    customFieldConfiguration: I;
    onSubmit: (customField: T) => void;
    isLoading: boolean;
    canUpdate: boolean;
  }>;
  Create: React.FC<{
    customFieldConfiguration: I;
    isLoading: boolean;
    setAsOptional?: boolean;
    setDefaultValue?: boolean;
  }>;
}

export interface CustomFieldFactoryFilterOption {
  key: string;
  label: string;
  value: string | boolean | null;
}

export type CustomFieldEuiTableColumn<T> = Pick<
  EuiTableComputedColumnType<CaseUI>,
  'name' | 'width' | 'data-test-subj'
> & {
  render: (customField: T) => React.ReactNode;
};

export type CustomFieldFactory<
  T extends CaseUICustomField,
  I = CasesConfigurationUICustomField
> = () => {
  id: string;
  label: string;
  getEuiTableColumn: (params: I) => CustomFieldEuiTableColumn<T>;
  build: () => CustomFieldType<T, I>;
  getFilterOptions?: (configuration: I) => CustomFieldFactoryFilterOption[];
  getDefaultValue?: () => T['value'];
  convertNullToEmpty?: (value: T['value']) => string;
  convertValueToDisplayText?: (value: T['value'], configuration: I) => string;
};

export type CustomFieldBuilderMap = {
  readonly [key in CustomFieldTypes]: CustomFieldFactory<CaseUICustomField>;
};

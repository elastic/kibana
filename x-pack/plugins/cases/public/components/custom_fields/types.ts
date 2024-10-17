/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { EuiTableComputedColumnType } from '@elastic/eui';

import type { CaseCustomField, CustomFieldTypes } from '../../../common/types/domain';
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

export interface CustomFieldFactoryFilterOption<T extends CaseUICustomField> {
  key: string;
  label: string;
  value: T['value'];
}

export type CustomFieldEuiTableColumn = Pick<
  EuiTableComputedColumnType<CaseUI>,
  'name' | 'width' | 'data-test-subj'
> & {
  render: (customField: CaseCustomField) => React.ReactNode;
};

export type CustomFieldFactory<
  T extends CaseUICustomField,
  I = CasesConfigurationUICustomField
> = () => {
  id: string;
  label: string;
  getEuiTableColumn: (params: I) => CustomFieldEuiTableColumn;
  build: () => CustomFieldType<T, I>;
  getFilterOptions?: (configuration: I) => Array<CustomFieldFactoryFilterOption<T>>;
  getDefaultValue?: () => string | boolean | null;
  convertNullToEmpty?: (value: string | boolean | null) => string;
  convertValueToDisplayText?: (value: T['value'], configuration: I) => string;
};

export type CustomFieldBuilderMap = {
  readonly [key in CustomFieldTypes]: CustomFieldFactory<CaseUICustomField>;
};

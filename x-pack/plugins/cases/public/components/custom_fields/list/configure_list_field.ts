/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CustomFieldFactory } from '../types';
import type {
  CaseCustomFieldList,
  ListCustomFieldConfiguration,
} from '../../../../common/types/domain';

import { CustomFieldTypes } from '../../../../common/types/domain';
import * as i18n from '../translations';
import { getEuiTableColumn } from './get_eui_table_column';
import { Edit } from './edit';
import { View } from './view';
import { Configure } from './configure';
import { Create } from './create';

export const configureListCustomFieldFactory: CustomFieldFactory<
  CaseCustomFieldList,
  ListCustomFieldConfiguration
> = () => ({
  id: CustomFieldTypes.LIST,
  label: i18n.LIST_LABEL,
  getEuiTableColumn,
  build: () => ({
    Configure,
    Edit,
    View,
    Create,
  }),
  convertNullToEmpty: (value) => (value == null ? '' : String(value)),
  getFilterOptions: ({ options }) => options.map((option) => ({ ...option, value: option.key })),
  convertValueToDisplayText: (
    value: { [x: string]: string } | null,
    configuration: ListCustomFieldConfiguration
  ) => {
    if (!value) return '';
    const selectedKey = Object.keys(value)[0];
    const option = configuration.options.find((opt) => opt.key === selectedKey);
    return option?.label ?? '';
  },
});

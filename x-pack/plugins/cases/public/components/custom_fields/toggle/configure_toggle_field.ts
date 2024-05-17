/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseCustomFieldToggle } from '../../../../common/types/domain';
import type { CustomFieldFactory } from '../types';

import { CustomFieldTypes } from '../../../../common/types/domain';
import * as i18n from '../translations';
import { Configure } from './configure';
import { Create } from './create';
import { Edit } from './edit';
import { getEuiTableColumn } from './get_eui_table_column';
import { View } from './view';

export const configureToggleCustomFieldFactory: CustomFieldFactory<CaseCustomFieldToggle> = () => ({
  id: CustomFieldTypes.TOGGLE,
  label: i18n.TOGGLE_LABEL,
  getEuiTableColumn,
  build: () => ({
    Configure,
    Edit,
    View,
    Create,
  }),
  filterOptions: [
    { key: 'on', label: i18n.TOGGLE_FIELD_ON_LABEL, value: true },
    { key: 'off', label: i18n.TOGGLE_FIELD_OFF_LABEL, value: false },
  ],
});

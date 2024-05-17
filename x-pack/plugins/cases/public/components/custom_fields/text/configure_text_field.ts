import type { CaseCustomFieldText } from '../../../../common/types/domain';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CustomFieldFactory } from '../types';

import { CustomFieldTypes } from '../../../../common/types/domain';
import * as i18n from '../translations';
import { Configure } from './configure';
import { Create } from './create';
import { Edit } from './edit';
import { getEuiTableColumn } from './get_eui_table_column';
import { View } from './view';

export const configureTextCustomFieldFactory: CustomFieldFactory<CaseCustomFieldText> = () => ({
  id: CustomFieldTypes.TEXT,
  label: i18n.TEXT_LABEL,
  getEuiTableColumn,
  build: () => ({
    Configure,
    Edit,
    View,
    Create,
  }),
});

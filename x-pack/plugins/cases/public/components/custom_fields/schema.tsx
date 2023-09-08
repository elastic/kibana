/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import * as i18n from './translations';
import type { CustomFieldTypesUI } from './types';
import type { ListOptions, BasicOptions } from './field_options/config';

const { emptyField } = fieldValidators;

export const customFieldTypes: CustomFieldTypesUI[] = ['Text', 'List', 'Toggle'];

export interface FormProps {
  fieldLabel: string;
  fieldType: CustomFieldTypesUI;
  fieldOptions: BasicOptions | ListOptions;
  textAreaHeight?: string;
}

export const schema = {
  fieldLabel: {
    label: i18n.FIELD_LABEL,
    type: FIELD_TYPES.TEXT,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD(i18n.FIELD_LABEL)),
      },
    ],
  },
  fieldType: {
    label: i18n.FIELD_TYPE,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD(i18n.FIELD_LABEL)),
      },
    ],
  },
  fieldOptions: {
    label: i18n.FIELD_OPTIONS,
    type: FIELD_TYPES.CHECKBOX,
  },
};

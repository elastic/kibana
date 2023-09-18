/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import * as i18n from './translations';
import type { CustomFieldTypes } from '../../../common/types/domain';
import { MAX_CUSTOM_FIELD_LABEL_LENGTH } from '../../../common/constants';

const { emptyField, maxLengthField } = fieldValidators;

export interface FormProps {
  label: string;
  type: CustomFieldTypes;
}

export const schema = {
  label: {
    label: i18n.FIELD_LABEL,
    type: FIELD_TYPES.TEXT,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD(i18n.FIELD_LABEL)),
      },
      {
        validator: maxLengthField({
          length: MAX_CUSTOM_FIELD_LABEL_LENGTH,
          message: i18n.MAX_LENGTH_ERROR('fieldLabel', MAX_CUSTOM_FIELD_LABEL_LENGTH),
        }),
      },
    ],
  },
  type: {
    label: i18n.FIELD_TYPE,
    type: FIELD_TYPES.SUPER_SELECT,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD(i18n.FIELD_LABEL)),
      },
    ],
  },
};

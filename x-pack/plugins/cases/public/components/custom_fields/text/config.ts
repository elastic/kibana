/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../../common/constants';
import { MAX_LENGTH_ERROR, REQUIRED_FIELD } from '../translations';

const { emptyField } = fieldValidators;

export const getTextFieldConfig = ({
  required,
  label,
  defaultValue,
}: {
  required: boolean;
  label: string;
  defaultValue?: string | null;
}): FieldConfig<string> => {
  const validators = [];

  if (required) {
    validators.push({
      validator: emptyField(REQUIRED_FIELD(label)),
    });
  }

  return {
    ...(defaultValue && { defaultValue }),
    validations: [
      ...validators,
      {
        validator: ({ value }) => {
          if (value == null) {
            return;
          }

          if (value.length > MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH) {
            return {
              message: MAX_LENGTH_ERROR(label, MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH),
            };
          }
        },
      },
    ],
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import moment from 'moment';
import { REQUIRED_FIELD } from '../translations';

const { emptyField } = fieldValidators;

export const getDateFieldConfig = ({
  required,
  label,
  defaultValue,
}: {
  required: boolean;
  label: string;
  defaultValue?: string | null;
}): FieldConfig => {
  const validators = [];

  if (required) {
    validators.push({
      validator: emptyField(REQUIRED_FIELD(label)),
    });
  }

  return {
    ...(defaultValue && { defaultValue: moment(defaultValue) }),
    validations: [
      ...validators,
      {
        validator: ({ value }) => {
          // if (value == null) {
          // }
          // if (value.length > MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH) {
          //   return {
          //     message: MAX_LENGTH_ERROR(label, MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH),
          //   };
          // }
        },
      },
    ],
  };
};

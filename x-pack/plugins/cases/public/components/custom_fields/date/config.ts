/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import moment from 'moment';
import { isEmpty } from 'lodash';
import { REQUIRED_FIELD } from '../translations';

export const getDateFieldConfig = ({
  required,
  label,
  defaultValue,
}: {
  required: boolean;
  label: string;
  defaultValue?: string | null;
}): FieldConfig => {
  return {
    ...(defaultValue && { defaultValue }),
    validations: [
      {
        validator: ({ value }) => {
          if (required && (value == null || isEmpty(value))) {
            return { message: REQUIRED_FIELD(label) };
          }
        },
      },
      {
        validator: ({ value }) => {
          if (value == null || isEmpty(value)) {
            return;
          }
          if (!moment(value, true).isValid()) {
            return {
              message: 'Not a valid date',
            };
          }
        },
      },
    ],
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { OBSERVABLE_TYPE_EMAIL } from '../../../common/constants';

export const normalizeValueType = (value: string): keyof typeof fieldsConfig.value | 'generic' => {
  if (value in fieldsConfig.value) {
    return value as keyof typeof fieldsConfig.value;
  }

  return 'generic';
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_REGEX = /^[a-zA-Z0-9._:/\\]+$/;

const notStringError = (path: string) => ({
  code: 'ERR_NOT_STRING',
  message: 'Value should be a string',
  path,
});

const { emptyField } = fieldValidators;

export const emailValidator: ValidationFunc = (...args: Parameters<ValidationFunc>) => {
  const [{ value, path }] = args;

  if (typeof value !== 'string') {
    return notStringError(path);
  }

  if (!EMAIL_REGEX.test(value)) {
    return {
      code: 'ERR_NOT_EMAIL',
      message: 'Value should be an email',
      path,
    };
  }
};

export const genericValidator: ValidationFunc = (...args: Parameters<ValidationFunc>) => {
  const [{ value, path }] = args;

  if (typeof value !== 'string') {
    return notStringError(path);
  }

  if (!GENERIC_REGEX.test(value)) {
    return {
      code: 'ERR_NOT_VALID',
      message: 'Value is invalid',
      path,
    };
  }
};

export const fieldsConfig = {
  value: {
    generic: {
      validations: [
        {
          validator: emptyField('Value is required'),
        },
        {
          validator: genericValidator,
        },
      ],
      label: 'Value',
    },
    [OBSERVABLE_TYPE_EMAIL.key]: {
      validations: [
        {
          validator: emptyField('Value is required'),
        },
        {
          validator: emailValidator,
        },
      ],
      label: 'Email',
    },
  },
  typeKey: {
    validations: [
      {
        validator: emptyField('Type is required'),
      },
    ],
    label: 'Type',
  },
  description: {
    label: 'Description',
  },
};

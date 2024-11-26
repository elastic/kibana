/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
} from '../../../common/constants';

export const normalizeValueType = (value: string): keyof typeof fieldsConfig.value | 'generic' => {
  if (value in fieldsConfig.value) {
    return value as keyof typeof fieldsConfig.value;
  }

  return 'generic';
};

const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_REGEX = /^[a-zA-Z0-9._:/\\]+$/;

// NOTE: consider if making this more sophisitcated makes sense
const IPV4_SIMPLIFIED = /^(\d{1,3}\.){3}\d{1,3}$/;
// NOTE: consider if making this more sophisitcated makes sense
const IPV6_SIMPLIFIED = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

const notStringError = (path: string) => ({
  code: 'ERR_NOT_STRING',
  message: 'Value should be a string',
  path,
});

const { emptyField } = fieldValidators;

const validatorFactory =
  (
    regex: RegExp,
    message: string = 'Value is invalid',
    code: string = 'ERR_NOT_VALID'
  ): ValidationFunc =>
  (...args: Parameters<ValidationFunc>) => {
    const [{ value, path }] = args;

    if (typeof value !== 'string') {
      return notStringError(path);
    }

    if (!regex.test(value)) {
      return {
        code,
        message,
        path,
      };
    }
  };

export const emailValidator = validatorFactory(
  EMAIL_REGEX,
  'Value should be an email',
  'ERR_NOT_EMAIL'
);

export const genericValidator = validatorFactory(GENERIC_REGEX);
export const domainValidator = validatorFactory(DOMAIN_REGEX);
export const ipv4Validator = validatorFactory(IPV4_SIMPLIFIED);
export const ipv6Validator = validatorFactory(IPV6_SIMPLIFIED);

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
    [OBSERVABLE_TYPE_DOMAIN.key]: {
      validations: [
        {
          validator: emptyField('Value is required'),
        },
        {
          validator: domainValidator,
        },
      ],
      label: 'Domain',
    },
    [OBSERVABLE_TYPE_IPV4.key]: {
      validations: [
        {
          validator: emptyField('Value is required'),
        },
        {
          validator: ipv4Validator,
        },
      ],
      label: 'IPv4',
    },
    [OBSERVABLE_TYPE_IPV6.key]: {
      validations: [
        {
          validator: emptyField('Value is required'),
        },
        {
          validator: ipv6Validator,
        },
      ],
      label: 'IPv6',
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

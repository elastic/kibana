/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  UseField,
  JsonEditorField,
  ValidationFuncArg,
  fieldValidators,
  FieldConfig,
} from '../../../shared_imports';

const { isJsonField } = fieldValidators;

/**
 * This is a special component that does not have an explicit entry in {@link PARAMETERS_DEFINITION}.
 *
 * We use it to store custom defined parameters in a field called "otherTypeJson".
 */

const fieldConfig: FieldConfig<any> = {
  label: i18n.translate('xpack.idxMgmt.mappingsEditor.otherTypeJsonFieldLabel', {
    defaultMessage: 'Type Parameters JSON',
  }),
  defaultValue: {},
  validations: [
    {
      validator: isJsonField(
        i18n.translate(
          'xpack.idxMgmt.mappingsEditor.parameters.validations.otherTypeJsonInvalidJSONErrorMessage',
          {
            defaultMessage: 'Invalid JSON.',
          }
        )
      ),
    },
    {
      validator: ({ value }: ValidationFuncArg<any, any>) => {
        const json = JSON.parse(value);
        if (Array.isArray(json)) {
          return {
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.otherTypeJsonArrayNotAllowedErrorMessage',
              {
                defaultMessage: 'Arrays are not allowed.',
              }
            ),
          };
        }
      },
    },
    {
      validator: ({ value }: ValidationFuncArg<any, any>) => {
        const json = JSON.parse(value);
        if (json.type) {
          return {
            code: 'ERR_CUSTOM_TYPE_OVERRIDDEN',
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.otherTypeJsonTypeFieldErrorMessage',
              {
                defaultMessage: 'Cannot override the "type" field.',
              }
            ),
          };
        }
      },
    },
  ],
  deserializer: (value: any) => {
    if (value === '') {
      return value;
    }
    return JSON.stringify(value, null, 2);
  },
  serializer: (value: string) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      // swallow error and return non-parsed value;
      return value;
    }
  },
};

export const OtherTypeJsonParameter = () => (
  <UseField path="otherTypeJson" config={fieldConfig} component={JsonEditorField} />
);

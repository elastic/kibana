/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';
import { isEmpty } from 'lodash';
import { fieldValidators } from '../../../../shared_imports';
import * as i18n from './translations';

export const THRESHOLD_FIELD_CONFIG = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.THRESHOLD_FIELD_LABEL,
  helpText: i18n.THRESHOLD_FIELD_HELP_TEXT,
  validations: [
    {
      validator: (
        ...args: Parameters<ValidationFunc>
      ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
        return fieldValidators.maxLengthField({
          length: 3,
          message: i18n.THRESHOLD_FIELD_COUNT_VALIDATION_ERROR,
        })(...args);
      },
    },
  ],
};

export const THRESHOLD_VALUE_CONFIG = {
  type: FIELD_TYPES.NUMBER,
  label: i18n.THRESHOLD_VALUE_LABEL,
  validations: [
    {
      validator: (
        ...args: Parameters<ValidationFunc>
      ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
        return fieldValidators.numberGreaterThanField({
          than: 1,
          message: i18n.THRESHOLD_VALUE_VALIDATION_ERROR,
          allowEquality: true,
        })(...args);
      },
    },
  ],
};

export function getCardinalityFieldConfig(path: string) {
  return {
    defaultValue: [] as unknown,
    fieldsToValidateOnChange: [`${path}.cardinality.field`, `${path}.cardinality.value`],
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.CARDINALITY_FIELD_LABEL,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;

          if (
            isEmpty(formData[`${path}.cardinality.field`]) &&
            !isEmpty(formData[`${path}.cardinality.value`])
          ) {
            return fieldValidators.emptyField(i18n.CARDINALITY_FIELD_MISSING_VALIDATION_ERROR)(
              ...args
            );
          }
        },
      },
    ],
    helpText: i18n.CARDINALITY_FIELD_HELP_TEXT,
  };
}

export function getCardinalityValueConfig(path: string) {
  return {
    fieldsToValidateOnChange: [`${path}.cardinality.field`, `${path}.cardinality.value`],
    type: FIELD_TYPES.NUMBER,
    label: i18n.CARDINALITY_VALUE_LABEL,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;

          if (!isEmpty(formData[`${path}.cardinality.field`])) {
            return fieldValidators.numberGreaterThanField({
              than: 1,
              message: i18n.CARDINALITY_VALUE_VALIDATION_ERROR,
              allowEquality: true,
            })(...args);
          }
        },
      },
    ],
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode } from '@elastic/eui';

import {
  FormSchema,
  FIELD_TYPES,
  VALIDATION_TYPES,
  FieldConfig,
  fieldFormatters,
  fieldValidators,
} from '../../../shared_imports';

import {
  INVALID_INDEX_PATTERN_CHARS,
  INVALID_TEMPLATE_NAME_CHARS,
} from '../../../../common/constants';

const {
  emptyField,
  containsCharsField,
  startsWithField,
  indexPatternField,
  lowerCaseStringField,
  isJsonField,
} = fieldValidators;
const { toInt } = fieldFormatters;
const indexPatternInvalidCharacters = INVALID_INDEX_PATTERN_CHARS.join(' ');

export const nameConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldNameLabel', {
    defaultMessage: 'Name',
  }),
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.idxMgmt.templateValidation.templateNameRequiredError', {
          defaultMessage: 'A template name is required.',
        })
      ),
    },
    {
      validator: containsCharsField({
        chars: ' ',
        message: i18n.translate('xpack.idxMgmt.templateValidation.templateNameSpacesError', {
          defaultMessage: 'Spaces are not allowed in a template name.',
        }),
      }),
    },
    {
      validator: startsWithField({
        char: '_',
        message: i18n.translate('xpack.idxMgmt.templateValidation.templateNameUnderscoreError', {
          defaultMessage: 'A template name must not start with an underscore.',
        }),
      }),
    },
    {
      validator: startsWithField({
        char: '.',
        message: i18n.translate('xpack.idxMgmt.templateValidation.templateNamePeriodError', {
          defaultMessage: 'A template name must not start with a period.',
        }),
      }),
    },
    {
      validator: containsCharsField({
        chars: INVALID_TEMPLATE_NAME_CHARS,
        message: ({ charsFound }) =>
          i18n.translate('xpack.idxMgmt.templateValidation.templateNameInvalidaCharacterError', {
            defaultMessage: 'A template name must not contain the character "{invalidChar}"',
            values: { invalidChar: charsFound[0] },
          }),
      }),
    },
    {
      validator: lowerCaseStringField(
        i18n.translate('xpack.idxMgmt.templateValidation.templateNameLowerCaseRequiredError', {
          defaultMessage: 'The template name must be in lowercase.',
        })
      ),
    },
  ],
};

export const nameConfigWithoutValidations: FieldConfig = {
  ...nameConfig,
  validations: [],
};

export const schemas: Record<string, FormSchema> = {
  logistics: {
    name: nameConfig,
    indexPatterns: {
      type: FIELD_TYPES.COMBO_BOX,
      defaultValue: [],
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldIndexPatternsLabel', {
        defaultMessage: 'Index patterns',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.idxMgmt.templateForm.stepLogistics.fieldIndexPatternsHelpText"
          defaultMessage="Spaces and the characters {invalidCharactersList} are not allowed."
          values={{
            invalidCharactersList: <strong>{indexPatternInvalidCharacters}</strong>,
          }}
        />
      ),
      validations: [
        {
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.templateValidation.indexPatternsRequiredError', {
              defaultMessage: 'At least one index pattern is required.',
            })
          ),
        },
        {
          validator: indexPatternField(i18n),
          type: VALIDATION_TYPES.ARRAY_ITEM,
        },
      ],
    },
    order: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldOrderLabel', {
        defaultMessage: 'Order (optional)',
      }),
      formatters: [toInt],
    },
    priority: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldPriorityLabel', {
        defaultMessage: 'Priority (optional)',
      }),
      formatters: [toInt],
    },
    version: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldVersionLabel', {
        defaultMessage: 'Version (optional)',
      }),
      formatters: [toInt],
    },
    _meta: {
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.metaFieldEditorLabel', {
        defaultMessage: '_meta field data (optional)',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.idxMgmt.templateForm.stepLogistics.metaFieldEditorHelpText"
          defaultMessage="Use JSON format: {code}"
          values={{
            code: <EuiCode>{JSON.stringify({ arbitrary_data: 'anything_goes' })}</EuiCode>,
          }}
        />
      ),
      validations: [
        {
          validator: isJsonField(
            i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.metaFieldEditorJsonError', {
              defaultMessage: 'The _meta field JSON is not valid.',
            }),
            { allowEmptyString: true }
          ),
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
    },
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ToggleField,
  ComboBoxField,
  ValidationFunc,
} from '../../../../../../shared_imports';

import { isArrayOfStrings } from './shared';

const { emptyField, minLengthField } = fieldValidators;

/**
 * Allow empty strings ('') to pass this validation.
 */
const isStringLengthOne: ValidationFunc = ({ value }) => {
  return typeof value === 'string' && value !== '' && value.length !== 1
    ? {
        message: i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.convertForm.separatorLengthError',
          {
            defaultMessage: 'A separator value must be 1 character.',
          }
        ),
      }
    : undefined;
};

export const fieldsConfig: Record<string, FieldConfig> = {
  field: {
    type: FIELD_TYPES.TEXT,
    serializer: String,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.fieldFieldLabel', {
      defaultMessage: 'Field',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.fieldRequiredError', {
            defaultMessage: 'A field value is required.',
          })
        ),
      },
    ],
  },
  target_fields: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: (v) => {
      return isArrayOfStrings(v) ? v : [];
    },
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.targetFieldsFieldLabel', {
      defaultMessage: 'Target fields',
    }),
    validations: [
      {
        validator: minLengthField({
          length: 1,
          message: i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.csvForm.targetFieldRequiredError',
            {
              defaultMessage: 'A target fields value is required.',
            }
          ),
        }),
      },
    ],
  },
  separator: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.separatorFieldLabel', {
      defaultMessage: 'Separator',
    }),
    validations: [
      {
        validator: isStringLengthOne,
      },
    ],
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.convertForm.separatorHelpText"
        defaultMessage="Default value is {value}"
        values={{ value: <EuiCode inline>{','}</EuiCode> }}
      />
    ),
  },
  quote: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.quoteFieldLabel', {
      defaultMessage: 'Quote',
    }),
    validations: [
      {
        validator: isStringLengthOne,
      },
    ],
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.convertForm.quoteHelpText"
        defaultMessage="Default value is {value}"
        values={{ value: <EuiCode inline>{'"'}</EuiCode> }}
      />
    ),
  },
  trim: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: (v) => (typeof v === 'boolean' ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.trimFieldLabel', {
      defaultMessage: 'Trim',
    }),
  },
  empty_value: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.emptyValueFieldLabel', {
      defaultMessage: 'Empty value',
    }),
  },
  ignore_missing: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: (v) => (typeof v === 'boolean' ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.cicleForm.ignoreMissingFieldLabel',
      {
        defaultMessage: 'Ignore missing',
      }
    ),
  },
};

export const CSV: FunctionComponent = () => {
  return (
    <>
      <UseField config={fieldsConfig.field} component={Field} path="fields.field" />

      <UseField
        config={fieldsConfig.target_fields}
        component={ComboBoxField}
        path="fields.target_fields"
      />

      <UseField config={fieldsConfig.separator} component={Field} path="fields.separator" />

      <UseField config={fieldsConfig.quote} component={Field} path="fields.quote" />

      <UseField config={fieldsConfig.trim} component={ToggleField} path="fields.trim" />

      <UseField config={fieldsConfig.empty_value} component={Field} path="fields.empty_value" />

      <UseField
        config={fieldsConfig.ignore_missing}
        component={ToggleField}
        path="fields.ignore_missing"
      />
    </>
  );
};

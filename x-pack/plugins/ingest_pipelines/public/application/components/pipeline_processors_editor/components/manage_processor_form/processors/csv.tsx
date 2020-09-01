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
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ToggleField,
  ComboBoxField,
  ValidationFunc,
} from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldNameField } from './common_fields/field_name_field';

import { to } from './shared';

const { minLengthField } = fieldValidators;

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

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  target_fields: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.targetFieldsFieldLabel', {
      defaultMessage: 'Target fields',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.targetFieldsHelpText', {
      defaultMessage: 'The array of fields to assign extracted values to.',
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
  /* Optional fields config */
  separator: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.separatorFieldLabel', {
      defaultMessage: 'Separator (optional)',
    }),
    validations: [
      {
        validator: isStringLengthOne,
      },
    ],
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.convertForm.separatorHelpText"
        defaultMessage="Separator used in CSV, has to be single character string. Default value is {value}."
        values={{ value: <EuiCode inline>{','}</EuiCode> }}
      />
    ),
  },
  quote: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.quoteFieldLabel', {
      defaultMessage: 'Quote (optional)',
    }),
    validations: [
      {
        validator: isStringLengthOne,
      },
    ],
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.convertForm.quoteHelpText"
        defaultMessage="Quote used in CSV, has to be single character string. Default value is {value}."
        values={{ value: <EuiCode inline>{'"'}</EuiCode> }}
      />
    ),
  },
  trim: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.trimFieldLabel', {
      defaultMessage: 'Trim',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.trimFieldHelpText', {
      defaultMessage: 'Trim whitespaces in unquoted fields',
    }),
  },
  empty_value: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.emptyValueFieldLabel', {
      defaultMessage: 'Empty value (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.convertForm.emptyValueFieldHelpText',
      {
        defaultMessage:
          'Value used to fill empty fields, empty fields will be skipped if this is not provided.',
      }
    ),
  },
};

export const CSV: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.fieldNameHelpText', {
          defaultMessage: 'The field to extract data from.',
        })}
      />

      <UseField
        config={fieldsConfig.target_fields}
        component={ComboBoxField}
        path="fields.target_fields"
      />

      <UseField config={fieldsConfig.separator} component={Field} path="fields.separator" />

      <UseField config={fieldsConfig.quote} component={Field} path="fields.quote" />

      <UseField config={fieldsConfig.trim} component={ToggleField} path="fields.trim" />

      <UseField config={fieldsConfig.empty_value} component={Field} path="fields.empty_value" />

      <IgnoreMissingField />
    </>
  );
};

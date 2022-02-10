/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ToggleField,
  ComboBoxField,
  ValidationFunc,
  SerializerFunc,
} from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldNameField } from './common_fields/field_name_field';

import { to, from } from './shared';

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
            defaultMessage: 'Must be a single character.',
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
      defaultMessage: 'Output fields. Extracted values are mapped to these fields.',
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
    serializer: from.emptyStringToUndefined,
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
        defaultMessage="Delimiter used in the CSV data. Defaults to {value}."
        values={{ value: <EuiCode>{','}</EuiCode> }}
      />
    ),
  },
  quote: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
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
        defaultMessage="Escape character used in the CSV data. Defaults to {value}."
        values={{ value: <EuiCode>{'"'}</EuiCode> }}
      />
    ),
  },
  trim: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.trimFieldLabel', {
      defaultMessage: 'Trim',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.trimFieldHelpText', {
      defaultMessage: 'Remove whitespaces in unquoted CSV data.',
    }),
  },
  empty_value: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.emptyValueFieldLabel', {
      defaultMessage: 'Empty value (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.convertForm.emptyValueFieldHelpText',
      {
        defaultMessage:
          'Used to fill empty fields. If no value is provided, empty fields are skipped.',
      }
    ),
  },
};

export const CSV: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.csvForm.fieldNameHelpText', {
          defaultMessage: 'Field containing CSV data.',
        })}
      />

      <UseField
        config={fieldsConfig.target_fields}
        component={ComboBoxField}
        path="fields.target_fields"
        data-test-subj="targetFieldsField"
      />

      <UseField
        config={fieldsConfig.separator}
        component={Field}
        path="fields.separator"
        data-test-subj="separatorValueField"
      />

      <UseField
        config={fieldsConfig.quote}
        component={Field}
        path="fields.quote"
        data-test-subj="quoteValueField"
      />

      <UseField
        config={fieldsConfig.trim}
        component={ToggleField}
        path="fields.trim"
        data-test-subj="trimSwitch"
      />

      <UseField
        config={fieldsConfig.empty_value}
        component={Field}
        path="fields.empty_value"
        data-test-subj="emptyValueField"
      />

      <IgnoreMissingField
        defaultValue={true}
        serializer={from.undefinedIfValue(true) as SerializerFunc<boolean>}
      />
    </>
  );
};

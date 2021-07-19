/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  FIELD_TYPES,
  useFormData,
  SelectField,
  ToggleField,
  UseField,
  Field,
} from '../../../../../../shared_imports';
import { hasTemplateSnippet } from '../../../utils';

import { FieldsConfig, to, from } from './shared';

import { FieldNameField } from './common_fields/field_name_field';

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  // This is a required field, but we exclude validation because we accept empty values as ''
  value: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldLabel', {
      defaultMessage: 'Value',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.valueFieldHelpText"
        defaultMessage="Value for the field. Used only when {field} is not specified."
        values={{
          field: <EuiCode>{'copy_from'}</EuiCode>,
        }}
      />
    ),
    fieldsToValidateOnChange: ['fields.copy_from', 'fields.value'],
    validations: [
      {
        validator: ({ value, path, formData }) => {
          if (isEmpty(value) && isEmpty(formData['fields.copy_from'])) {
            return {
              path,
              message: i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.setForm.valueFieldError',
                {
                  defaultMessage: 'Either this field or copy_from should be specified.',
                }
              ),
            };
          }
        },
      },
    ],
  },
  copy_from: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.copyFromFieldLabel', {
      defaultMessage: 'Copy from',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.copyFromFieldHelpText"
        defaultMessage="The origin field which will be copied to {field}. Used only when {value} is not specified."
        values={{
          field: <EuiCode>{'field'}</EuiCode>,
          value: <EuiCode>{'value'}</EuiCode>,
        }}
      />
    ),
    fieldsToValidateOnChange: ['fields.copy_from', 'fields.value'],
    validations: [
      {
        validator: ({ value, path, formData }) => {
          if (isEmpty(value) && isEmpty(formData['fields.value'])) {
            return {
              path,
              message: i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.setForm.copyFromFieldError',
                {
                  defaultMessage: 'Either this field or value should be specified.',
                }
              ),
            };
          }
        },
      },
    ],
  },
  mediaType: {
    type: FIELD_TYPES.SELECT,
    defaultValue: 'application/json',
    serializer: from.undefinedIfValue('application/json'),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.mediaTypeFieldLabel', {
      defaultMessage: 'Media Type',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.mediaTypeHelpText"
        defaultMessage="Media type for encoding value."
      />
    ),
  },
  /* Optional fields config */
  override: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(true),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.overrideFieldLabel', {
      defaultMessage: 'Override',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.overrideFieldHelpText"
        defaultMessage="If enabled, overwrite existing field values. If disabled, only update {nullValue} fields."
        values={{
          nullValue: <EuiCode>{'null'}</EuiCode>,
        }}
      />
    ),
  },
  ignore_empty_value: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.setForm.ignoreEmptyValueFieldLabel',
      {
        defaultMessage: 'Ignore empty value',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.ignoreEmptyValueFieldHelpText"
        defaultMessage="If {valueField} is {nullValue} or an empty string, do not
        update the field."
        values={{
          valueField: <EuiCode>{'value'}</EuiCode>,
          nullValue: <EuiCode>{'null'}</EuiCode>,
        }}
      />
    ),
  },
};

/**
 * Disambiguate name from the Set data structure
 */
export const SetProcessor: FunctionComponent = () => {
  const [{ fields }] = useFormData({ watch: ['fields.value', 'fields.copy_from'] });

  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldNameField', {
          defaultMessage: 'Field to insert or update.',
        })}
      />

      <UseField
        config={fieldsConfig.value}
        component={Field}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'valueFieldInput',
            disabled: !!fields?.copy_from,
          },
        }}
        path="fields.value"
      />

      {hasTemplateSnippet(fields?.value) && (
        <UseField
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'mediaTypeSelectorField',
              options: [
                {
                  value: 'application/json',
                  text: 'application/json',
                },
                {
                  value: 'text/plain',
                  text: 'text/plain',
                },
                {
                  value: 'application/x-www-form-urlencoded',
                  text: 'application/x-www-form-urlencoded',
                },
              ],
            },
          }}
          config={fieldsConfig.mediaType}
          component={SelectField}
          path="fields.media_type"
        />
      )}

      <UseField
        config={fieldsConfig.copy_from}
        component={Field}
        path="fields.copy_from"
        componentProps={{
          euiFieldProps: {
            disabled: !!fields?.value,
          },
        }}
        data-test-subj="copyFromField"
      />

      <UseField
        config={fieldsConfig.override}
        component={ToggleField}
        path="fields.override"
        data-test-subj="overrideField"
      />

      <UseField
        config={fieldsConfig.ignore_empty_value}
        component={ToggleField}
        path="fields.ignore_empty_value"
        data-test-subj="ignoreEmptyField"
      />
    </>
  );
};

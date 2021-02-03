/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode } from '@elastic/eui';

import {
  FIELD_TYPES,
  fieldValidators,
  ToggleField,
  UseField,
  Field,
} from '../../../../../../shared_imports';

import { FieldsConfig, to, from } from './shared';

import { FieldNameField } from './common_fields/field_name_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  value: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldLabel', {
      defaultMessage: 'Value',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldHelpText', {
      defaultMessage: 'Value for the field.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
    ],
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
  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldNameField', {
          defaultMessage: 'Field to insert or update.',
        })}
      />

      <UseField config={fieldsConfig.value} component={Field} path="fields.value" />

      <UseField config={fieldsConfig.override} component={ToggleField} path="fields.override" />

      <UseField
        config={fieldsConfig.ignore_empty_value}
        component={ToggleField}
        path="fields.ignore_empty_value"
      />
    </>
  );
};

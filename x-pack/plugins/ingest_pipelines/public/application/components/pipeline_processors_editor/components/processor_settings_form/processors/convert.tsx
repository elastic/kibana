/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ToggleField,
  SelectField,
} from '../../../../../../shared_imports';

const { emptyField } = fieldValidators;

export const fieldsConfig: Record<string, FieldConfig> = {
  field: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.fieldFieldLabel', {
      defaultMessage: 'Field',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.fieldRequiredError', {
            defaultMessage: 'A field value is required.',
          })
        ),
      },
    ],
  },
  type: {
    type: FIELD_TYPES.TEXT,
    defaultValue: '',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.typeFieldLabel', {
      defaultMessage: 'Type',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.typeRequiredError', {
            defaultMessage: 'A type value is required.',
          })
        ),
      },
    ],
  },
  target_field: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.targetFieldLabel', {
      defaultMessage: 'Target field',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.convertForm.targetFieldHelpText',
      {
        defaultMessage: 'By default field is updated in-place.',
      }
    ),
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

export const Convert: FunctionComponent = () => {
  return (
    <>
      <UseField config={fieldsConfig.field} component={Field} path="fields.field" />

      <UseField
        componentProps={{
          euiFieldProps: {
            options: [
              {
                value: 'integer',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.integerOption',
                  { defaultMessage: 'Integer' }
                ),
              },
              {
                value: 'float',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.floatOption',
                  { defaultMessage: 'Float' }
                ),
              },
              {
                value: 'double',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.doubleOption',
                  { defaultMessage: 'Double' }
                ),
              },
              {
                value: 'string',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.stringOption',
                  { defaultMessage: 'String' }
                ),
              },
              {
                value: 'boolean',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.booleanOption',
                  { defaultMessage: 'Boolean' }
                ),
              },
              {
                value: 'auto',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.autoOption',
                  { defaultMessage: 'Auto' }
                ),
              },
            ],
          },
        }}
        config={fieldsConfig.type}
        component={SelectField}
        path="fields.type"
      />

      <UseField config={fieldsConfig.target_field} component={Field} path="fields.target_field" />

      <UseField
        config={fieldsConfig.ignore_missing}
        component={ToggleField}
        path="fields.ignore_missing"
      />
    </>
  );
};

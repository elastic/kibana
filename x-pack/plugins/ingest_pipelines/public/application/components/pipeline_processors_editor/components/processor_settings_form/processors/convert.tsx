/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  SelectField,
} from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
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
};

export const Convert: FunctionComponent = () => {
  return (
    <>
      <FieldNameField />

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

      <IgnoreMissingField />
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, fieldValidators, UseField, Field } from '../../../../../../shared_imports';

import { TextEditor } from '../field_components';

import { FieldsConfig } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { TargetField } from './common_fields/target_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  pattern: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.patternFieldLabel', {
      defaultMessage: 'Pattern',
    }),
    deserializer: String,
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.patternFieldHelpText', {
      defaultMessage: 'The pattern to be replaced.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.patternRequiredError', {
            defaultMessage: 'A pattern value is required.',
          })
        ),
      },
    ],
  },

  replacement: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.replacementFieldLabel', {
      defaultMessage: 'Replacement',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.gsubForm.replacementFieldHelpText',
      { defaultMessage: 'The string to replace the matching patterns with.' }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.replacementRequiredError', {
            defaultMessage: 'A replacement value is required.',
          })
        ),
      },
    ],
  },
};

export const Gsub: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.gsubForm.fieldNameHelpText',
          { defaultMessage: 'The field to apply the replacement to.' }
        )}
      />

      <UseField
        config={fieldsConfig.pattern}
        component={TextEditor}
        componentProps={{
          editorProps: {
            height: 75,
            options: { minimap: { enabled: false } },
          },
        }}
        path="fields.pattern"
      />

      <UseField config={fieldsConfig.replacement} component={Field} path="fields.replacement" />

      <TargetField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.gsubForm.targetFieldHelpText',
          {
            defaultMessage: 'The field to assign the converted value to.',
          }
        )}
      />

      <IgnoreMissingField />
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flow } from 'lodash';
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, fieldValidators, UseField, Field } from '../../../../../../shared_imports';

import { TextEditor } from '../field_components';

import { EDITOR_PX_HEIGHT, FieldsConfig, from, to, isJSONStringValidator } from './shared';
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
    deserializer: flow(String, to.escapeBackslashes),
    serializer: from.unescapeBackslashes,
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.patternFieldHelpText', {
      defaultMessage: 'Regular expression used to match substrings in the field.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.patternRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
      {
        validator: isJSONStringValidator,
      },
    ],
  },

  // This is a required field, but we exclude validation because we accept empty values as ''
  replacement: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.replacementFieldLabel', {
      defaultMessage: 'Replacement',
    }),
    deserializer: flow(String, to.escapeBackslashes),
    serializer: from.unescapeBackslashes,
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.gsubForm.replacementFieldHelpText',
      {
        defaultMessage:
          'Replacement text for matches. A blank value will remove the matched text from the resulting text.',
      }
    ),
  },
};

export const Gsub: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.gsubForm.fieldNameHelpText',
          { defaultMessage: 'Field to search for matches.' }
        )}
      />

      <UseField
        config={fieldsConfig.pattern}
        component={TextEditor}
        componentProps={{
          editorProps: {
            height: EDITOR_PX_HEIGHT.extraSmall,
            options: { minimap: { enabled: false } },
          },
        }}
        path="fields.pattern"
      />

      <UseField config={fieldsConfig.replacement} component={Field} path="fields.replacement" />

      <TargetField />

      <IgnoreMissingField />
    </>
  );
};

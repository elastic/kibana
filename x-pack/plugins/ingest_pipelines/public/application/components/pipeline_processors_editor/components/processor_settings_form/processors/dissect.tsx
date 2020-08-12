/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { TextEditor } from '../field_components';

import {
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';

const { emptyField } = fieldValidators;

const fieldsConfig: Record<string, FieldConfig> = {
  /* Required field config */
  pattern: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dissectForm.patternFieldLabel', {
      defaultMessage: 'Pattern',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dissectForm.patternFieldHelpText',
      {
        defaultMessage: 'The pattern to apply to the field.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.dissectForm.patternRequiredError', {
            defaultMessage: 'A pattern value is required.',
          })
        ),
      },
    ],
  },
  /* Optional field config */
  append_separator: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dissectForm.appendSeparatorparaotrFieldLabel',
      {
        defaultMessage: 'Append separator (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dissectForm.appendSeparatorHelpText"
        defaultMessage="The character(s) that separate the appended fields. Default value is {value} (an empty string)."
        values={{ value: <EuiCode inline>{'""'}</EuiCode> }}
      />
    ),
  },
};

export const Dissect: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.dissectForm.fieldNameHelpText',
          { defaultMessage: 'The field to dissect.' }
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

      <UseField
        config={fieldsConfig.append_separator}
        component={Field}
        path="fields.append_separator"
      />

      <IgnoreMissingField />
    </>
  );
};

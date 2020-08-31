/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  UseField,
  ComboBoxField,
  ToggleField,
  fieldValidators,
} from '../../../../../../shared_imports';

import { XJsonEditor } from '../field_components';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, to, from } from './shared';

const { emptyField, isJsonField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required field configs */
  patterns: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.patternsFieldLabel', {
      defaultMessage: 'Patterns',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.patternsHelpText', {
      defaultMessage:
        'Grok expressions used to match and extract named capture groups. Uses the first matching expression.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.grokForm.patternsValueRequiredError',
            { defaultMessage: 'A value is required.' }
          )
        ),
      },
    ],
  },
  /* Optional field configs */
  pattern_definitions: {
    type: FIELD_TYPES.TEXT,
    deserializer: to.jsonString,
    serializer: from.optionalJson,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.patternDefinitionsLabel', {
      defaultMessage: 'Pattern definitions (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.grokForm.patternDefinitionsHelpText',
      {
        defaultMessage:
          'A map of pattern-name and pattern tuples defining custom patterns. Patterns matching existing names will override the pre-existing definition.',
      }
    ),
    validations: [
      {
        validator: isJsonField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.grokForm.patternsDefinitionsInvalidJSONError',
            { defaultMessage: 'Invalid JSON' }
          ),
          {
            allowEmptyString: true,
          }
        ),
      },
    ],
  },

  trace_match: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.defaultBoolToUndef(false),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.traceMatchFieldLabel', {
      defaultMessage: 'Trace match',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.grokForm.traceMatchFieldHelpText',
      {
        defaultMessage: 'Add metadata about the matching expression to the document.',
      }
    ),
  },
};

export const Grok: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.grokForm.fieldNameHelpText',
          { defaultMessage: 'Field to search for matches.' }
        )}
      />

      <UseField component={ComboBoxField} config={fieldsConfig.patterns} path="fields.patterns" />

      <UseField
        component={XJsonEditor}
        config={fieldsConfig.pattern_definitions}
        componentProps={{
          editorProps: {
            height: 200,
            'aria-label': i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.grokForm.patternDefinitionsAriaLabel',
              {
                defaultMessage: 'Pattern definitions editor',
              }
            ),
          },
        }}
        path="fields.pattern_definitions"
      />

      <UseField
        component={ToggleField}
        config={fieldsConfig.trace_match}
        path="fields.trace_match"
      />

      <IgnoreMissingField />
    </>
  );
};

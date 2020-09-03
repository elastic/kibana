/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';

import {
  FIELD_TYPES,
  UseField,
  FieldConfig,
  UseArray,
  ToggleField,
  fieldValidators,
  getFieldValidityAndErrorMessage,
} from '../../../../../../shared_imports';

import { XJsonEditor, DragAndDropTextList } from '../field_components';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, to, from } from './shared';

const { isJsonField } = fieldValidators;

const i18nTexts = {
  addPatternLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.grokForm.patternsAddPatternLabel',
    { defaultMessage: 'Add pattern' }
  ),
};

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
        validator: ({ value }) => {
          const maybeArray = value as string[] | undefined;
          if (!maybeArray || maybeArray.length === 0 || maybeArray.every((v) => !v)) {
            return {
              message: i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.grokForm.patternsValueRequiredError',
                { defaultMessage: 'A value is required.' }
              ),
            };
          }
        },
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

      <UseArray path="fields.patterns" config={fieldsConfig.patterns as FieldConfig<any, string[]>}>
        {({ field, items, addItem, removeItem, moveItem }) => {
          const { errorMessage } = getFieldValidityAndErrorMessage(field);
          return (
            <EuiFormRow
              label={field.label}
              helpText={field.helpText}
              isInvalid={typeof errorMessage === 'string'}
              error={errorMessage}
              fullWidth
            >
              <DragAndDropTextList
                value={items}
                onMove={moveItem}
                onAdd={addItem}
                onRemove={removeItem}
                addLabel={i18nTexts.addPatternLabel}
              />
            </EuiFormRow>
          );
        }}
      </UseArray>

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

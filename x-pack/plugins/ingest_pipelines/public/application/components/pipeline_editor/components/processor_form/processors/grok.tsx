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
  UseArray,
  ToggleField,
  fieldValidators,
  ValidationFunc,
  ArrayItem,
} from '../../../../../../shared_imports';

import { XJsonEditor, DragAndDropTextList } from '../field_components';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, to, from, EDITOR_PX_HEIGHT } from './shared';

const { isJsonField, emptyField } = fieldValidators;

const i18nTexts = {
  addPatternLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.grokForm.patternsAddPatternLabel',
    { defaultMessage: 'Add pattern' }
  ),
};

const valueRequiredMessage = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.grokForm.patternsValueRequiredError',
  { defaultMessage: 'A value is required.' }
);

const patternsValidation: ValidationFunc<any, string, ArrayItem[]> = ({ value, formData }) => {
  if (value.length === 0) {
    return {
      message: valueRequiredMessage,
    };
  }
};

const patternValidation = emptyField(valueRequiredMessage);

const fieldsConfig: FieldsConfig = {
  /* Required field configs */
  patterns: {
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.patternsFieldLabel', {
      defaultMessage: 'Patterns',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.patternsHelpText', {
      defaultMessage:
        'Grok expressions used to match and extract named capture groups. Uses the first matching expression.',
    }),
    validations: [
      {
        validator: patternsValidation as ValidationFunc,
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
    serializer: from.undefinedIfValue(false),
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

      <UseArray path="fields.patterns" validations={fieldsConfig.patterns.validations}>
        {({ items, addItem, removeItem, moveItem, error }) => {
          return (
            <DragAndDropTextList
              label={fieldsConfig.patterns.label!}
              helpText={fieldsConfig.patterns.helpText}
              error={error}
              value={items}
              onMove={moveItem}
              onAdd={addItem}
              onRemove={removeItem}
              addLabel={i18nTexts.addPatternLabel}
              textValidation={patternValidation}
            />
          );
        }}
      </UseArray>

      <UseField
        component={XJsonEditor}
        config={fieldsConfig.pattern_definitions}
        componentProps={{
          editorProps: {
            height: EDITOR_PX_HEIGHT.medium,
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

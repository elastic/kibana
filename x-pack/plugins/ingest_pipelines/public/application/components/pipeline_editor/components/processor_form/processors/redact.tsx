/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import {
  FIELD_TYPES,
  Field,
  UseField,
  UseArray,
  fieldValidators,
  ValidationFunc,
} from '../../../../../../shared_imports';

import { InputList, XJsonAndJsonEditor } from '../field_components';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, to, from, EDITOR_PX_HEIGHT, isXJsonField } from './shared';

const { emptyField } = fieldValidators;

const i18nTexts = {
  addPatternLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.redactForm.patternsAddPatternLabel',
    { defaultMessage: 'Add pattern' }
  ),
};

const valueRequiredMessage = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.redactForm.patternsValueRequiredError',
  { defaultMessage: 'A value is required.' }
);

const patternsValidation: ValidationFunc = ({ value }) => {
  if (typeof value === 'string' && value.length === 0) {
    return {
      message: valueRequiredMessage,
    };
  }
};

const patternValidations = [emptyField(valueRequiredMessage)];

const fieldsConfig: FieldsConfig = {
  /* Required field configs */
  patterns: {
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.redactForm.patternsFieldLabel', {
      defaultMessage: 'Patterns',
    }),
    deserializer: String,
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.redactForm.patternsHelpText', {
      defaultMessage: 'A list of grok expressions to match and redact named captures with.',
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
    deserializer: to.xJsonString,
    serializer: from.optionalXJson,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.redactForm.patternDefinitionsLabel',
      {
        defaultMessage: 'Pattern definitions (optional)',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.redactForm.patternDefinitionsHelpText',
      {
        defaultMessage:
          'A map of pattern-name and pattern tuples defining custom patterns to be used by the processor. Patterns matching existing names will override the pre-existing definition.',
      }
    ),
    validations: [
      {
        validator: isXJsonField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.redactForm.patternsDefinitionsInvalidJSONError',
            { defaultMessage: 'Invalid JSON' }
          ),
          {
            allowEmptyString: true,
          }
        ),
      },
    ],
  },

  prefix: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.redactForm.prefixLabel', {
      defaultMessage: 'Prefix (optional)',
    }),
    deserializer: String,
    serializer: from.undefinedIfValue(''),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.redactForm.prefixFieldHelpText"
        defaultMessage="Start a redacted section with this token. If not specified, defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'<'}</EuiCode> }}
      />
    ),
  },

  suffix: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.redactForm.suffixLabel', {
      defaultMessage: 'Suffix (optional)',
    }),
    deserializer: String,
    serializer: from.undefinedIfValue(''),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.redactForm.suffixFieldHelpText"
        defaultMessage="End a redacted section with this token. If not specified, defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'>'}</EuiCode> }}
      />
    ),
  },
};

export const Redact: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.redactForm.fieldNameHelpText',
          { defaultMessage: 'Field to be redacted.' }
        )}
      />

      <UseArray path="fields.patterns" validations={fieldsConfig.patterns.validations}>
        {({ items, addItem, removeItem, error }) => {
          return (
            <InputList
              label={fieldsConfig.patterns.label!}
              helpText={
                typeof fieldsConfig.patterns.helpText === 'function'
                  ? fieldsConfig.patterns.helpText()
                  : fieldsConfig.patterns.helpText
              }
              error={error}
              value={items}
              onAdd={addItem}
              onRemove={removeItem}
              addLabel={i18nTexts.addPatternLabel}
              textValidations={patternValidations}
              textDeserializer={fieldsConfig.patterns?.deserializer}
              textSerializer={fieldsConfig.patterns?.serializer}
            />
          );
        }}
      </UseArray>

      <UseField
        component={XJsonAndJsonEditor}
        config={fieldsConfig.pattern_definitions}
        componentProps={{
          editorProps: {
            'data-test-subj': 'patternDefinitionsField',
            height: EDITOR_PX_HEIGHT.medium,
            'aria-label': i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.redactForm.patternDefinitionsAriaLabel',
              {
                defaultMessage: 'Pattern definitions editor',
              }
            ),
          },
        }}
        path="fields.pattern_definitions"
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            config={fieldsConfig.prefix}
            component={Field}
            path="fields.prefix"
            data-test-subj="prefixField"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            config={fieldsConfig.suffix}
            component={Field}
            path="fields.suffix"
            data-test-subj="suffixField"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <IgnoreMissingField />
    </>
  );
};

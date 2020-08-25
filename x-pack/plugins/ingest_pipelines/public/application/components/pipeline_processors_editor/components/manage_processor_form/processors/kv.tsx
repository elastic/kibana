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
  UseField,
  Field,
  ComboBoxField,
  ToggleField,
} from '../../../../../../shared_imports';

import { FieldsConfig, from, to } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  field_split: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.fieldSplitFieldLabel', {
      defaultMessage: 'Field split',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.fieldSplitHelpText', {
      defaultMessage: 'Regex pattern for splitting key-value pairs.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.fieldSplitRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
    ],
  },
  value_split: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.valueSplitFieldLabel', {
      defaultMessage: 'Value split',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.valueSplitHelpText', {
      defaultMessage: 'Regex pattern for splitting the key from the value within a key-value pair.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.valueSplitRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
    ],
  },

  /* Optional fields config */
  include_keys: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: from.optionalArrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.includeKeysFieldLabel', {
      defaultMessage: 'Include keys',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.includeKeysHelpText', {
      defaultMessage:
        'List of keys to filter and insert into document. Defaults to including all keys.',
    }),
  },

  exclude_keys: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: from.optionalArrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.excludeKeysFieldLabel', {
      defaultMessage: 'Exclude keys',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.excludeKeysHelpText', {
      defaultMessage: 'List of keys to exclude from document.',
    }),
  },

  prefix: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.prefixFieldLabel', {
      defaultMessage: 'Prefix',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.prefixHelpText', {
      defaultMessage: 'Prefix to be added to extracted keys.',
    }),
  },

  trim_key: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.trimKeyFieldLabel', {
      defaultMessage: 'Trim key',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.trimKeyHelpText', {
      defaultMessage: 'Characters to trim from extracted keys.',
    }),
  },

  trim_value: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.trimValueFieldLabel', {
      defaultMessage: 'Trim value',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.trimValueHelpText', {
      defaultMessage: 'Characters to trim from extracted values.',
    }),
  },

  strip_brackets: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.stripBracketsFieldLabel', {
      defaultMessage: 'Strip brackets',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.kvForm.stripBracketsHelpText"
        defaultMessage="If true, strip brackets {paren}, {angle}, {square} as well as quotes {singleQuote} and {doubleQuote} from extracted values."
        values={{
          paren: <EuiCode>{'()'}</EuiCode>,
          angle: <EuiCode>&lt;&gt;</EuiCode>,
          square: <EuiCode>{'[]'}</EuiCode>,
          singleQuote: <EuiCode>{"'"}</EuiCode>,
          doubleQuote: <EuiCode>{'"'}</EuiCode>,
        }}
      />
    ),
  },
};

export const Kv: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.kvForm.fieldNameHelpText', {
          defaultMessage: 'Field to be parsed.',
        })}
      />

      <UseField component={Field} config={fieldsConfig.field_split} path="fields.field_split" />

      <UseField component={Field} config={fieldsConfig.value_split} path="fields.value_split" />

      <TargetField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.kvForm.targetFieldHelpText',
          {
            defaultMessage:
              'Field to insert the extracted keys into. Defaults to the root of the document.',
          }
        )}
      />

      <UseField
        component={ComboBoxField}
        config={fieldsConfig.include_keys}
        path="fields.include_keys"
      />

      <UseField
        component={ComboBoxField}
        config={fieldsConfig.exclude_keys}
        path="fields.exclude_keys"
      />

      <IgnoreMissingField />

      <UseField component={Field} config={fieldsConfig.prefix} path="fields.prefix" />

      <UseField component={Field} config={fieldsConfig.trim_key} path="fields.trim_key" />

      <UseField component={Field} config={fieldsConfig.trim_value} path="fields.trim_value" />

      <UseField
        component={ToggleField}
        config={fieldsConfig.strip_brackets}
        path="fields.strip_brackets"
      />
    </>
  );
};

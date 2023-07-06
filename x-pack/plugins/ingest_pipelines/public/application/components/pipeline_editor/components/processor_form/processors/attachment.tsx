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
  ComboBoxField,
  FIELD_TYPES,
  UseField,
  ToggleField,
  Field,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, to, from } from './shared';

const propertyValues: string[] = [
  'content',
  'title',
  'author',
  'keywords',
  'date',
  'content_type',
  'content_length',
  'language',
];

const fieldsConfig: FieldsConfig = {
  /* Optional field configs */
  indexed_chars: {
    type: FIELD_TYPES.NUMBER,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.attachment.indexedCharsFieldLabel',
      {
        defaultMessage: 'Indexed chars (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.attachment.indexedCharsFieldHelperText"
        defaultMessage="The number of chars being used for extraction to prevent huge fields. Use -1 for no limit. Defaults to {field}."
        values={{ field: <EuiCode>{'100000'}</EuiCode> }}
      />
    ),
  },
  indexed_chars_field: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.attachment.indexedCharsFieldFieldLabel',
      {
        defaultMessage: 'Indexed chars field (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.attachment.indexedCharsFieldFieldHelperText"
        defaultMessage="Field name from which you can overwrite the number of chars being used for extraction. Defaults to {field}."
        values={{ field: <EuiCode>{'null'}</EuiCode> }}
      />
    ),
  },
  properties: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: from.optionalArrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.attachment.propertiesFieldLabel', {
      defaultMessage: 'Properties (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.attachment.propertiesFieldHelperText"
        defaultMessage=" Array of properties to select to be stored. Defaults to {field}."
        values={{ field: <EuiCode>{'all'}</EuiCode> }}
      />
    ),
  },
  remove_binary: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.attachment.removeBinaryFieldLabel',
      {
        defaultMessage: 'Remove binary',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.attachment.removeBinaryFieldHelpText',
      {
        defaultMessage: 'If enabled, the binary field will be removed from the document.',
      }
    ),
  },
  resource_name: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.attachment.resourceNameFieldLabel',
      {
        defaultMessage: 'Resource name (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.attachment.resourceNameFieldHelperText"
        defaultMessage="Field containing the name of the resource to decode. If specified, the processor passes this resource name to the underlying Tika library to enable Resource Name Based Detection."
      />
    ),
  },
};

export const Attachment: FunctionComponent = () => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <FieldNameField
            helpText={
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.attachment.fieldHelpText"
                defaultMessage="The field to get the base64 encoded field from."
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <TargetField
            helpText={
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.attachment.targetHelpText"
                defaultMessage="The field that will hold the attachment information. Defaults to {field}."
                values={{ field: <EuiCode>{'attachment'}</EuiCode> }}
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            data-test-subj="indexedCharsField"
            config={fieldsConfig.indexed_chars}
            component={Field}
            path="fields.indexed_chars"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            data-test-subj="indexedCharsFieldField"
            config={fieldsConfig.indexed_chars_field}
            component={Field}
            path="fields.indexed_chars_field"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <UseField
        component={ComboBoxField}
        config={fieldsConfig.properties}
        euiFieldProps={{
          'data-test-subj': 'propertiesField',
          noSuggestions: false,
          options: propertyValues.map((label) => ({ label })),
        }}
        path="fields.properties"
      />

      <UseField
        data-test-subj="removeBinaryField"
        component={ToggleField}
        config={fieldsConfig.remove_binary}
        path="fields.remove_binary"
      />

      <UseField
        data-test-subj="resourceNameField"
        config={fieldsConfig.resource_name}
        component={Field}
        path="fields.resource_name"
      />

      <IgnoreMissingField />
    </>
  );
};

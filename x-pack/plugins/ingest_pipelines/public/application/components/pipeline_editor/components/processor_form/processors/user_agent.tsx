/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiCode, EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { FIELD_TYPES, ToggleField, UseField, Field } from '../../../../../../shared_imports';

import { FieldsConfig, from, to } from './shared';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';
import { PropertiesField } from './common_fields/properties_field';

const propertyOptions: EuiComboBoxOptionOption[] = [
  { label: 'name' },
  { label: 'os' },
  { label: 'device' },
  { label: 'original' },
  { label: 'version' },
];

const fieldsConfig: FieldsConfig = {
  /* Optional fields config */
  regex_file: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    deserializer: String,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.userAgentForm.regexFileFieldLabel',
      {
        defaultMessage: 'Regex file (optional)',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.userAgentForm.regexFileFieldHelpText',
      {
        defaultMessage:
          'File containing the regular expressions used to parse the user agent string.',
      }
    ),
  },
  extract_device_type: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.userAgentForm.extractDeviceTypeFieldLabel', {
      defaultMessage: 'Extract Device Type',
    }),
    // label: (
      // <EuiFlexGroup gutterSize="xs">
        // <EuiFlexItem grow={false}>
          // Extract Device Type
        // </EuiFlexItem>
        // <EuiFlexItem>
          // <EuiBetaBadge
            // label="Beta"
            // tooltipContent="This module is not GA. Please help us by reporting any bugs."
          // />
        // </EuiFlexItem>
      // </EuiFlexGroup>
    // ) as unknown,
    // helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.userAgentForm.extractDeviceTypeFieldHelpText', {
      // defaultMessage: 'Extracts device type from the user agent string.',
    // }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.fingerprint.saltHelpText"
        defaultMessage="{label}"
        values={{
          label: (
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                Salt value for the hash function.
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiBetaBadge
                  label="Beta"
                  tooltipContent="This module is not GA. Please help us by reporting any bugs."
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }}
      />
    ),
  }
};

export const UserAgent: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.userAgentForm.fieldNameHelpText',
          { defaultMessage: 'Field containing the user agent string.' }
        )}
      />

      <UseField
        config={fieldsConfig.regex_file}
        component={Field}
        path="fields.regex_file"
        data-test-subj="regexFileField"
      />

      <TargetField
        helpText={
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.userAgentForm.targetFieldHelpText"
            defaultMessage="Output field. Defaults to {defaultField}."
            values={{
              defaultField: <EuiCode>{'user_agent'}</EuiCode>,
            }}
          />
        }
      />

      <PropertiesField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.userAgentForm.propertiesFieldHelpText',
          { defaultMessage: 'Properties added to the target field.' }
        )}
        euiFieldProps={{
          options: propertyOptions as [],
          noSuggestions: !propertyOptions,
          'data-test-subj': 'propertiesValueField',
        }}
      />

      <UseField
        config={fieldsConfig.extract_device_type}
        component={ToggleField}
        path="fields.extract_device_type"
        data-test-subj="extractDeviceTypeSwitch"
      />

      <IgnoreMissingField />
    </>
  );
};

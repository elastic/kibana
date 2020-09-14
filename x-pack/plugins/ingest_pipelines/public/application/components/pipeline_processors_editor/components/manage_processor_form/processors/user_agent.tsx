/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { FIELD_TYPES, UseField, Field } from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
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
          'A filename containing the regular expressions for parsing the user agent string.',
      }
    ),
  },
};

export const UserAgent: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.userAgentForm.fieldNameHelpText',
          { defaultMessage: 'The field containing the user agent string.' }
        )}
      />

      <UseField config={fieldsConfig.regex_file} component={Field} path="fields.regex_file" />

      <TargetField />

      <PropertiesField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.userAgentForm.propertiesFieldHelpText',
          { defaultMessage: 'Properties added to the target field.' }
        )}
        propertyOptions={propertyOptions}
      />

      <IgnoreMissingField />
    </>
  );
};

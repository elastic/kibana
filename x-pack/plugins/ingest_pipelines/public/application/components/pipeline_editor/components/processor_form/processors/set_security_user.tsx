/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

import { FIELD_TYPES, UseField, ComboBoxField } from '../../../../../../shared_imports';

import { FieldsConfig, to, from } from './shared';

import { FieldNameField } from './common_fields/field_name_field';

const userProperties: string[] = [
  'username',
  'roles',
  'email',
  'full_name',
  'metadata',
  'api_key',
  'realm',
  'authentication_type',
];

const comboBoxOptions = userProperties.map((prop) => ({ label: prop }));
const helpTextValues = userProperties.join(', ');

const fieldsConfig: FieldsConfig = {
  /* Optional fields config */
  properties: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: from.optionalArrayOfStrings,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.setSecurityUserForm.propertiesFieldLabel',
      {
        defaultMessage: 'Properties (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.propertiesFieldHelpText"
        defaultMessage="User details to add. Defaults to: {value}"
        values={{
          value: <EuiCode>[{helpTextValues}]</EuiCode>,
        }}
      />
    ),
  },
};

export const SetSecurityUser: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.setSecurityUserForm.fieldNameField',
          {
            defaultMessage: 'Output field.',
          }
        )}
      />

      <UseField
        config={fieldsConfig.properties}
        component={ComboBoxField}
        componentProps={{
          euiFieldProps: {
            options: comboBoxOptions,
            noSuggestions: false,
          },
        }}
        path="fields.properties"
      />
    </>
  );
};

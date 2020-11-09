/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { ComboBoxField, FIELD_TYPES, UseField } from '../../../../../../../shared_imports';

import { FieldsConfig, to } from '../shared';

const fieldsConfig: FieldsConfig = {
  properties: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: (v: string[]) => (v.length ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.commonFields.propertiesFieldLabel',
      {
        defaultMessage: 'Properties (optional)',
      }
    ),
  },
};

interface Props {
  helpText?: React.ReactNode;
  propertyOptions?: EuiComboBoxOptionOption[];
}

export const PropertiesField: FunctionComponent<Props> = ({ helpText, propertyOptions }) => {
  return (
    <UseField
      config={{
        ...fieldsConfig.properties,
        helpText,
      }}
      component={ComboBoxField}
      path="fields.properties"
      componentProps={{
        euiFieldProps: {
          options: propertyOptions || [],
          noSuggestions: !propertyOptions,
        },
      }}
    />
  );
};

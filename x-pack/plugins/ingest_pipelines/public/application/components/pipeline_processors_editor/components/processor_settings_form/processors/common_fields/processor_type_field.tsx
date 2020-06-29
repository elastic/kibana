/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import {
  FIELD_TYPES,
  FieldConfig,
  UseField,
  fieldValidators,
  ComboBoxField,
} from '../../../../../../../shared_imports';
import { types } from '../../map_processor_type_to_form';

interface Props {
  initialType?: string;
}

const { emptyField } = fieldValidators;

const typeConfig: FieldConfig = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.typeField.typeFieldLabel', {
    defaultMessage: 'Processor',
  }),
  deserializer: (value: string | undefined) => {
    if (value) {
      return [value];
    }
    return [];
  },
  serializer: (value: string[]) => {
    return value[0];
  },
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.pipelineEditor.typeField.fieldRequiredError', {
          defaultMessage: 'A type is required.',
        })
      ),
    },
  ],
};

export const ProcessorTypeField: FunctionComponent<Props> = ({ initialType }) => {
  return (
    <UseField
      config={typeConfig}
      defaultValue={initialType}
      path="type"
      component={ComboBoxField}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': 'processorTypeSelector',
          fullWidth: true,
          options: types.map((type) => ({ label: type, value: type })),
          noSuggestions: false,
          singleSelection: {
            asPlainText: true,
          },
        },
      }}
    />
  );
};

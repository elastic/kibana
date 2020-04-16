/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { EuiComboBox } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import {
  FIELD_TYPES,
  FieldConfig,
  UseField,
  fieldValidators,
  FormRow,
} from '../../../../../../shared_imports';
import { types } from '../../map_processor_type_to_form';

interface Props {
  initialType?: string;
}

const { emptyField } = fieldValidators;

const typeConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.typeField.typeFieldLabel', {
    defaultMessage: 'Type',
  }),
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
    <FormRow
      title={i18n.translate('xpack.ingestPipelines.pipelineEditor.typeFieldTitle', {
        defaultMessage: 'Type',
      })}
    >
      <UseField config={typeConfig} path={'type'} defaultValue={initialType}>
        {typeField => {
          return (
            <EuiComboBox
              onChange={([selected]) => typeField.setValue(selected?.value)}
              selectedOptions={
                typeField.value
                  ? [{ value: typeField.value as string, label: typeField.value as string }]
                  : []
              }
              singleSelection={{ asPlainText: true }}
              options={types.map(type => ({ label: type, value: type }))}
            />
          );
        }}
      </UseField>
    </FormRow>
  );
};

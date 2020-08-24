/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  ComboBoxField,
} from '../../../../../../shared_imports';

import { FieldsConfig, to } from './shared';
import { FieldNameField } from './common_fields/field_name_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  value: {
    defaultValue: [],
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.valueFieldLabel', {
      defaultMessage: 'Value',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.valueFieldHelpText', {
      defaultMessage: 'The value to be appended by this processor.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.valueRequiredError', {
            defaultMessage: 'A value to set is required.',
          })
        ),
      },
    ],
  },
};

export const Append: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.fieldHelpText', {
          defaultMessage: 'The field to be appended to.',
        })}
      />

      <UseField config={fieldsConfig.value} component={ComboBoxField} path="fields.value" />
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  FIELD_TYPES,
  UseField,
  Field,
  fieldValidators,
  ValidationConfig,
} from '../../../../../../../shared_imports';

import { FieldsConfig } from '../shared';

const { emptyField } = fieldValidators;

export const fieldsConfig: FieldsConfig = {
  field: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.fieldFieldLabel', {
      defaultMessage: 'Field',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.fieldRequiredError', {
            defaultMessage: 'A field value is required.',
          })
        ),
      },
    ],
  },
};

interface Props {
  helpText?: React.ReactNode;
  /**
   * The field name requires a value. Processor specific validation
   * checks can be added here.
   */
  additionalValidations?: ValidationConfig[];
}

export const FieldNameField: FunctionComponent<Props> = ({ helpText, additionalValidations }) => (
  <UseField
    config={{
      ...fieldsConfig.field,
      helpText,
      validations: fieldsConfig.field.validations!.concat(additionalValidations ?? []),
    }}
    component={Field}
    path="fields.field"
  />
);

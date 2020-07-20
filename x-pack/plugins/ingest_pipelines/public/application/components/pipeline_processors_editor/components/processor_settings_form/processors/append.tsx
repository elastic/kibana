/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
} from '../../../../../../shared_imports';

const { emptyField } = fieldValidators;

export const fieldsConfig: Record<string, FieldConfig> = {
  field: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.fieldFieldLabel', {
      defaultMessage: 'Field',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.fieldRequiredError', {
            defaultMessage: 'A field value is required.',
          })
        ),
      },
    ],
  },
  value: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldLabel', {
      defaultMessage: 'Value',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueRequiredError', {
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
      <UseField config={fieldsConfig.field} component={Field} path="fields.field" />

      <UseField config={fieldsConfig.value} component={Field} path="fields.value" />
    </>
  );
};

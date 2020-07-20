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
  ToggleField,
} from '../../../../../../shared_imports';

const { emptyField } = fieldValidators;

export const fieldsConfig: Record<string, FieldConfig> = {
  field: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.bytesForm.fieldFieldLabel', {
      defaultMessage: 'Field',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.bytesForm.fieldRequiredError', {
            defaultMessage: 'A field value is required.',
          })
        ),
      },
    ],
  },
  target_field: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.bytesForm.targetFieldLabel', {
      defaultMessage: 'Target field',
    }),
  },
  ignore_missing: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: (v) => (typeof v === 'boolean' ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.bytesForm.ignoreMissingFieldLabel',
      {
        defaultMessage: 'Ignore missing',
      }
    ),
  },
};

export const Bytes: FunctionComponent = () => {
  return (
    <>
      <UseField config={fieldsConfig.field} component={Field} path="fields.field" />

      <UseField config={fieldsConfig.target_field} component={Field} path="fields.target_field" />

      <UseField
        config={fieldsConfig.ignore_missing}
        component={ToggleField}
        path="fields.ignore_missing"
      />
    </>
  );
};

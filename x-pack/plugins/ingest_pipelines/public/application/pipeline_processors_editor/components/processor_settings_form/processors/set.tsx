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
  FormRow,
  UseField,
  Field,
} from '../../../../../shared_imports';

const { emptyField } = fieldValidators;

const fieldConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldFieldLabel', {
    defaultMessage: 'Field',
  }),
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldRequiredError', {
          defaultMessage: 'A field value is required.',
        })
      ),
    },
  ],
};

const valueConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldLabel', {
    defaultMessage: 'Value',
  }),
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueRequiredError', {
          defaultMessage: 'A set value is required.',
        })
      ),
    },
  ],
};

export const SetProcessor: FunctionComponent = () => {
  return (
    <>
      <FormRow
        title={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldFieldTitle', {
          defaultMessage: 'Field',
        })}
      >
        <UseField config={fieldConfig} component={Field} path="field" />
      </FormRow>
      <FormRow
        title={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldTitle', {
          defaultMessage: 'Value',
        })}
      >
        <UseField config={valueConfig} component={Field} path="value" />
      </FormRow>
    </>
  );
};

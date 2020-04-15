/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  FormSchema,
  FIELD_TYPES,
  fieldValidators,
  FormRow,
  UseField,
  Field,
} from '../../../../../shared_imports';

import { ProcessorFormComponent } from '../types';

const { emptyField } = fieldValidators;

export const formSchema: FormSchema = {
  field: {
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
            defaultMessage: 'A set value is required.',
          })
        ),
      },
    ],
  },
};

interface SetOptions {
  field: string;
  value: string;
  override?: string;
}

const SetProcessor: ProcessorFormComponent<SetOptions> = () => {
  return (
    <>
      <FormRow
        title={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldFieldTitle', {
          defaultMessage: 'Field',
        })}
      >
        <UseField component={Field} path="field" />
      </FormRow>
      <FormRow
        title={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldTitle', {
          defaultMessage: 'Value',
        })}
      >
        <UseField component={Field} path="value" />
      </FormRow>
    </>
  );
};

export { SetProcessor as Component };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';

import {
  useForm,
  Form,
  FormSchema,
  getFormRow,
  FIELD_TYPES,
  fieldValidators,
  getUseField,
  Field,
} from '../../../shared_imports';

import { ProcessorFormComponent } from './types';

// Generic setup -- should be moved out
const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });
const { emptyField } = fieldValidators;

// Schema declaration
const formSchema: FormSchema = {
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

// Form component
interface SetOptions {
  field: string;
  value: string;
  override?: string;
}

export const SetProcessor: ProcessorFormComponent<SetOptions> = ({ processor, onSubmit }) => {
  const { form } = useForm({
    defaultValue: {
      ...processor.options,
    },
    schema: formSchema,
    onSubmit: (data, isValid) => {
      // TODO do something here
    },
  });

  return (
    <Form form={form}>
      <FormRow
        title={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldFieldTitle', {
          defaultMessage: 'Field',
        })}
      >
        <UseField path="field" />
      </FormRow>
      <FormRow
        title={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldTitle', {
          defaultMessage: 'Value',
        })}
      >
        <UseField path="value" />
      </FormRow>
      <EuiButton fill onClick={form.submit}>
        {i18n.translate('xpack.ingestPipelines.pipelineEditor.form.submitButtonLabel', {
          defaultMessage: 'Submit',
        })}
      </EuiButton>
    </Form>
  );
};

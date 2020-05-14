/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiSpacer, EuiButton } from '@elastic/eui';

import {
  Form,
  useForm,
  UseField,
  TextField,
  JsonEditorField,
  ComboBoxField,
  FormSchema,
  fieldValidators,
  VALIDATION_TYPES,
} from '../../../shared_imports';

const { emptyField, isJsonField, startsWithField } = fieldValidators;

interface MyForm {
  fields: {
    name: string;
    type: string;
  };
  seeds: Array<{ label: string }>;
  _meta: string;
}

const formSchema: FormSchema<MyForm> = {
  fields: {
    name: {
      label: 'Field name',
      helpText: 'Some help text',
      validations: [
        {
          validator: emptyField('The field cannot be empty'),
        },
      ],
    },
    type: {
      label: 'Field type',
      helpText: 'Some help text',
      validations: [
        {
          validator: emptyField('The field cannot be empty'),
        },
      ],
    },
  },
  seeds: {
    label: 'Seeds',
    helpText: 'Add an item with a dot (.) to see validation',
    defaultValue: [],
    validations: [
      {
        validator: emptyField('The field cannot be empty'),
      },
      {
        validator: startsWithField({ message: 'Cannot start with a period.', char: '.' }),
        type: VALIDATION_TYPES.ARRAY_ITEM,
      },
    ],
  },
  _meta: {
    label: 'Meta',
    helpText: 'Some help text',
    validations: [
      {
        validator: isJsonField('The JSON is invalid.'),
      },
    ],
    // There is a current issue in the lib that I will fix,
    // we should be able to simply do:
    // serializer: JSON.parse,
    serializer: (value: string) => {
      try {
        const serialized = JSON.parse(value);
        return serialized;
      } catch (e) {
        return value;
      }
    },
  },
};

export const FormWithFormLib = () => {
  const { form } = useForm<MyForm>({ schema: formSchema });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (!isValid) {
      console.log('Form is invalid!'); // eslint-disable-line
      return;
    }
    console.log(data);  // eslint-disable-line
  };

  return (
    <Form form={form}>
      <UseField path="fields.name" component={TextField} />
      <EuiSpacer />
      <UseField path="fields.type" component={TextField} />
      <EuiSpacer />
      <UseField
        path="seeds"
        component={ComboBoxField}
        componentProps={{ euiFieldProps: { placeholder: 'host:port' } }}
      />
      <EuiSpacer />
      <UseField
        path="_meta"
        component={JsonEditorField}
        componentProps={{
          euiCodeEditorProps: {
            height: '250px',
          },
        }}
      />
      <EuiSpacer />
      <EuiButton
        fill
        color="secondary"
        iconType="check"
        onClick={submitForm}
        disabled={form.isSubmitted && !form.isValid}
      >
        Save
      </EuiButton>
    </Form>
  );
};

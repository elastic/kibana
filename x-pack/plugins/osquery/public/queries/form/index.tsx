/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { Field, getUseField, useForm, UseField, Form } from '../../shared_imports';
import { CodeEditorField } from './code_editor_field';
import { formSchema } from './schema';

export const CommonUseField = getUseField({ component: Field });

const SAVED_QUERY_FORM_ID = 'savedQueryForm';

interface SavedQueryFormProps {
  defaultValue?: unknown;
  handleSubmit: () => Promise<void>;
  type?: string;
}

const SavedQueryFormComponent: React.FC<SavedQueryFormProps> = ({
  defaultValue,
  handleSubmit,
  type,
}) => {
  const { form } = useForm({
    // @ts-expect-error update types
    id: defaultValue ? SAVED_QUERY_FORM_ID + defaultValue.id : SAVED_QUERY_FORM_ID,
    schema: formSchema,
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
    },
    // @ts-expect-error update types
    defaultValue,
  });

  const { submit } = form;

  return (
    <Form form={form}>
      <CommonUseField path="name" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <CommonUseField
        path="platform"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        euiFieldProps={{
          options: [
            { value: 'darwin', text: 'macOS' },
            { value: 'freebsd', text: 'FreeBSD' },
            { value: 'linux', text: 'Linux' },
            { value: 'posix', text: 'Posix' },
            { value: 'windows', text: 'Windows' },
            { value: 'all', text: 'All' },
          ],
        }}
      />
      <EuiSpacer />
      <UseField path="query" component={CodeEditorField} />
      <EuiSpacer />
      <EuiButton onClick={submit}>{type === 'edit' ? 'Update' : 'Save'}</EuiButton>
    </Form>
  );
};

export const SavedQueryForm = React.memo(SavedQueryFormComponent);

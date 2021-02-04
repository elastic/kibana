/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { UseField, Form, useForm } from '../../shared_imports';
import { AgentsTableField } from './agents_table_field';

const FORM_ID = 'liveQueryForm';

interface LiveQueryFormProps {
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}

const LiveQueryFormComponent: React.FC<LiveQueryFormProps> = ({ onSubmit }) => {
  const { form } = useForm({
    id: FORM_ID,
    // schema: formSchema,
    onSubmit,
    options: {
      stripEmptyFields: false,
    },
    defaultValue: {},
  });

  const { submit } = form;

  return (
    <Form form={form}>
      <UseField path="agents" component={AgentsTableField} />
      <EuiSpacer />
      <EuiButton onClick={submit}>{'Send query'}</EuiButton>
    </Form>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);

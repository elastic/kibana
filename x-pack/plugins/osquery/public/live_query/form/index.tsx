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
import { LiveQueryQueryField } from './live_query_query_field';

const FORM_ID = 'liveQueryForm';

interface LiveQueryFormProps {
  defaultValue?: unknown;
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}

const LiveQueryFormComponent: React.FC<LiveQueryFormProps> = ({ defaultValue, onSubmit }) => {
  const { form } = useForm({
    id: FORM_ID,
    // schema: formSchema,
    onSubmit,
    options: {
      stripEmptyFields: false,
    },
    defaultValue: {
      // @ts-expect-error update types
      query: defaultValue ?? {
        id: null,
        query: '',
      },
    },
  });

  const { submit } = form;

  return (
    <Form form={form}>
      <UseField path="agentSelection" component={AgentsTableField} />
      <EuiSpacer />
      <UseField path="query" component={LiveQueryQueryField} />
      <EuiSpacer />
      <EuiButton onClick={submit}>{'Send query'}</EuiButton>
    </Form>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);

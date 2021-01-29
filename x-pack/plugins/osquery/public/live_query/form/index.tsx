/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';

import { UseField, Form, useForm } from '../../shared_imports';
import { AgentsTableField } from './agents_table_field';
import { CodeEditorField } from './code_editor_field';

const FORM_ID = 'liveQueryForm';

interface LiveQueryFormProps {
  actionDetails?: Record<string, string>;
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}

const LiveQueryFormComponent: React.FC<LiveQueryFormProps> = ({ actionDetails, onSubmit }) => {
  const handleSubmit = useCallback(
    (payload) => {
      onSubmit(payload);
      return Promise.resolve();
    },
    [onSubmit]
  );

  const { form } = useForm({
    id: FORM_ID,
    // schema: formSchema,
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
    },
    defaultValue: actionDetails,
    deserializer: ({ fields, _source }) => ({
      agents: fields?.agents,
      command: _source?.data?.commands[0],
    }),
  });

  const { submit } = form;

  return (
    <Form form={form}>
      <UseField path="agents" component={AgentsTableField} />
      <EuiSpacer />
      <UseField path="command" component={CodeEditorField} />
      <EuiButton onClick={submit}>Send query</EuiButton>
    </Form>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);

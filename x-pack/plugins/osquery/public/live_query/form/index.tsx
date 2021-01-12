/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { getUseField, UseField, Field, Form, useForm } from '../../shared_imports';
import { formSchema } from './schema';
import { AgentsTableField } from './agents_table_field';
import { CodeEditorField } from './code_editor_field';

const FORM_ID = 'liveQueryForm';

const CommonUseField = getUseField({ component: Field });

const LiveQueryFormComponent = ({ agents = [], commands = [] }) => {
  const initialState = useMemo(
    () => ({
      agents,
      commands,
    }),
    [agents, commands]
  );
  const handleSubmit = useCallback((payload) => {
    console.error('payload sub,it', payload);
    return Promise.resolve();
  }, []);

  console.error('initialSAtate', initialState);

  const { form } = useForm({
    id: FORM_ID,
    schema: formSchema,
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
    },
    defaultValue: initialState,
  });

  const { isSubmitted, isSubmitting, submit } = form;

  return (
    <Form form={form}>
      <UseField path="agents" component={AgentsTableField} />
      <EuiSpacer />
      <UseField path="commands" component={CodeEditorField} />
    </Form>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);

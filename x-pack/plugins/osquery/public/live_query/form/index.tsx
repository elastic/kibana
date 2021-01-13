/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { getUseField, UseField, Field, Form, useForm } from '../../shared_imports';
import { formSchema } from './schema';
import { AgentsTableField } from './agents_table_field';
import { CodeEditorField } from './code_editor_field';

const FORM_ID = 'liveQueryForm';

const CommonUseField = getUseField({ component: Field });

const LiveQueryFormComponent = ({ type, actionDetails, onSubmit }) => {
  if (type === 'edit' && isEmpty(actionDetails)) {
    return null;
  }

  // const initialState = useMemo(
  //   () => ({
  //     agents,
  //     commands,
  //   }),
  //   [agents, commands]
  // );
  const handleSubmit = useCallback((payload) => {
    console.error('payload sub,it', payload);
    onSubmit(payload);
    return Promise.resolve();
  }, []);

  // console.error('initialSAtate', initialState);

  const { form } = useForm({
    id: FORM_ID,
    // schema: formSchema,
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
    },
    defaultValue: actionDetails,
    serializer: (props) => {
      console.error('serializerProps', props);
      return props;
    },
    deserializer: ({ fields, _source, ...props }) => {
      console.error('deserializer props', props);

      console.error('deserializer outoput', {
        agents: fields?.agents,
        command: _source?.data?.commands[0],
      });

      return {
        agents: fields?.agents,
        command: _source?.data?.commands[0],
      };
    },
  });

  const { isSubmitted, isSubmitting, submit } = form;

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

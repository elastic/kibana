/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { getUseField, useForm, Field, Form, FIELD_TYPES } from '../../shared_imports';
import { PackQueriesField } from './pack_queries_field';

const CommonUseField = getUseField({ component: Field });

// @ts-expect-error update types
const PackFormComponent = ({ data, handleSubmit }) => {
  const { form } = useForm({
    id: 'addPackForm',
    onSubmit: (payload) => {
      return handleSubmit(payload);
    },
    defaultValue: data ?? {
      name: '',
      description: '',
      queries: [],
    },
    schema: {
      name: {
        type: FIELD_TYPES.TEXT,
        label: 'Pack name',
      },
      description: {
        type: FIELD_TYPES.TEXTAREA,
        label: 'Description',
      },
      queries: {
        type: FIELD_TYPES.MULTI_SELECT,
        label: 'Queries',
      },
    },
  });
  const { submit, isSubmitting } = form;

  return (
    <Form form={form}>
      <CommonUseField path="name" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <CommonUseField path="queries" component={PackQueriesField} />
      <EuiSpacer />
      <EuiButton isLoading={isSubmitting} fill onClick={submit}>
        {'Save pack'}
      </EuiButton>
    </Form>
  );
};

export const PackForm = React.memo(PackFormComponent);

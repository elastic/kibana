/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { getUseField, useForm, Field, Form, FIELD_TYPES } from '../../shared_imports';

const CommonUseField = getUseField({ component: Field });

// @ts-expect-error update types
const PackFormComponent = ({ data, handleSubmit }) => {
  const { form } = useForm({
    id: 'addPackForm',
    onSubmit: (payload) => {
      return handleSubmit(payload);
    },
    defaultValue: data,
    schema: {
      title: {
        type: FIELD_TYPES.TEXT,
        label: 'Pack name',
      },
      description: {
        type: FIELD_TYPES.TEXTAREA,
        label: 'Description',
      },
    },
  });
  const { submit } = form;

  return (
    <Form form={form}>
      <CommonUseField path="title" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <EuiButton fill onClick={submit}>
        {'Save pack'}
      </EuiButton>
    </Form>
  );
};

export const PackForm = React.memo(PackFormComponent);

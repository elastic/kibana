/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useForm, Form, getUseField, Field, FIELD_TYPES } from '../../shared_imports';

const CommonUseField = getUseField({ component: Field });

const FORM_ID = 'inputStreamForm';

const schema = {
  data_stream: {
    dataset: {
      type: FIELD_TYPES.TEXT,
    },
    type: {
      type: FIELD_TYPES.TEXT,
    },
  },
  enabled: {
    type: FIELD_TYPES.TOGGLE,
    label: 'Active',
  },
  id: {
    type: FIELD_TYPES.TEXT,
  },
  vars: {
    id: {
      type: {
        type: FIELD_TYPES.TEXT,
      },
      value: { type: FIELD_TYPES.TEXT },
    },
    interval: {
      type: {
        type: FIELD_TYPES.TEXT,
      },
      value: { type: FIELD_TYPES.TEXT },
    },
    query: {
      type: {
        type: FIELD_TYPES.TEXT,
      },
      value: { type: FIELD_TYPES.TEXT },
    },
  },
};

// @ts-expect-error update types
const InputStreamFormComponent = ({ data }) => {
  const { form } = useForm({
    id: FORM_ID,
    schema,
    defaultValue: data,
  });

  return (
    <Form form={form}>
      <CommonUseField path="vars.query.value" />
    </Form>
  );
};

export const InputStreamForm = React.memo(InputStreamFormComponent);

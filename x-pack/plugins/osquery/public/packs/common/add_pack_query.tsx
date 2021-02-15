/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

import { EuiButton, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { useQuery } from 'react-query';

import { getUseField, useForm, Field, Form, FIELD_TYPES } from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';

const CommonUseField = getUseField({ component: Field });

// @ts-expect-error update types
const AddPackQueryFormComponent = ({ handleSubmit }) => {
  const { http } = useKibana().services;
  const { data } = useQuery('savedQueryList', () =>
    http.get('/internal/osquery/saved_query', {
      query: {
        pageIndex: 0,
        pageSize: 100,
        sortField: 'updated_at',
        sortDirection: 'desc',
      },
    })
  );

  const { form } = useForm({
    id: 'addPackQueryForm',
    onSubmit: (payload) => {
      // console.error('subimt payload', payload);
      return handleSubmit(payload);
    },
    schema: {
      query: {
        type: FIELD_TYPES.SUPER_SELECT,
        label: 'Pick from Saved Queries',
      },
      interval: {
        type: FIELD_TYPES.NUMBER,
        label: 'Interval in seconds',
      },
    },
  });
  const { submit } = form;

  // console.error('data', data);

  const queryOptions =
    // @ts-expect-error update types
    data?.saved_objects.map((savedQuery) => ({
      value: savedQuery,
      inputDisplay: savedQuery.attributes.title,
      dropdownDisplay: (
        <>
          <strong>{savedQuery.attributes.title}</strong>
          <EuiText size="s" color="subdued">
            <p className="euiTextColor--subdued">{savedQuery.attributes.description}</p>
          </EuiText>
          <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
            {savedQuery.attributes.command}
          </EuiCodeBlock>
        </>
      ),
    })) ?? [];

  // console.error('queryOptions', queryOptions);

  return (
    <Form form={form}>
      <CommonUseField path="query" euiFieldProps={{ options: queryOptions }} />
      <EuiSpacer />
      <CommonUseField path="interval" />
      <EuiSpacer />
      <EuiButton fill onClick={submit}>
        {'Add query'}
      </EuiButton>
    </Form>
  );
};

export const AddPackQueryForm = React.memo(AddPackQueryFormComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import deepmerge from 'deepmerge';
import React, { useCallback } from 'react';

import { useForm, UseArray, UseField, getUseField, Field, Form } from '../../shared_imports';

import { OsqueryStreamField } from '../common/osquery_stream_field';
import { defaultValue, schema } from './schema';
import { combineMerge } from './utils';

const CommonUseField = getUseField({ component: Field });

const NEW_SCHEDULED_QUERY_FORM_ID = 'newScheduledQueryForm';

interface NewScheduledQueryFormProps {
  handleSubmit: () => Promise<void>;
}

const NewScheduledQueryFormComponent: React.FC<NewScheduledQueryFormProps> = ({ handleSubmit }) => {
  const { form } = useForm({
    schema,
    id: NEW_SCHEDULED_QUERY_FORM_ID,
    options: {
      stripEmptyFields: false,
    },
    onSubmit: handleSubmit,
    // @ts-expect-error update types
    defaultValue,
    serializer: (payload) =>
      deepmerge(defaultValue, payload, {
        arrayMerge: combineMerge,
      }),
  });
  const { submit } = form;

  const StreamsContent = useCallback(
    ({ items, addItem, removeItem }) => (
      <>
        {
          // @ts-expect-error update types
          items.map((item) => (
            <UseField
              key={item.path}
              path={item.path}
              component={OsqueryStreamField}
              // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
              removeItem={() => removeItem(item.id)}
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              defaultValue={{
                data_stream: {
                  type: 'logs',
                  dataset: 'osquery_elastic_managed.osquery',
                },
                vars: {
                  query: {
                    type: 'text',
                    value: '',
                  },
                  interval: {
                    type: 'text',
                    value: '',
                  },
                  id: {
                    type: 'text',
                    value: '',
                  },
                },
                enabled: true,
              }}
            />
          ))
        }
        <EuiButtonEmpty onClick={addItem} iconType="plusInCircleFilled">
          {'Add query'}
        </EuiButtonEmpty>
      </>
    ),
    []
  );

  return (
    <Form form={form}>
      <CommonUseField path="name" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <UseArray path="inputs[0].streams" initialNumberOfItems={1} readDefaultValueOnForm={false}>
        {StreamsContent}
      </UseArray>
      <EuiSpacer />
      <EuiButton fill onClick={submit}>
        {'Save'}
      </EuiButton>
    </Form>
  );
};

export const NewScheduledQueryForm = React.memo(NewScheduledQueryFormComponent);

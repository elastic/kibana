/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import produce from 'immer';
import { get } from 'lodash/fp';
import { EuiButtonEmpty, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import uuid from 'uuid';
import React, { useEffect } from 'react';
import deepEqual from 'fast-deep-equal';

import {
  UseField,
  useForm,
  UseArray,
  getUseField,
  Field,
  ToggleField,
  Form,
} from '../../shared_imports';

import { OsqueryStreamField } from '../../scheduled_query/common/osquery_stream_field';
import { schema } from './schema';

const CommonUseField = getUseField({ component: Field });

const EDIT_SCHEDULED_QUERY_FORM_ID = 'editScheduledQueryForm';

interface EditScheduledQueryFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
  handleSubmit: () => Promise<void>;
}

const EditScheduledQueryFormComponent: React.FC<EditScheduledQueryFormProps> = ({
  data,
  handleSubmit,
  // @ts-expect-error update types
  handleChange,
}) => {
  const { form } = useForm({
    id: EDIT_SCHEDULED_QUERY_FORM_ID,
    onSubmit: handleSubmit,
    schema,
    defaultValue: data,
    options: {
      stripEmptyFields: false,
    },
    // @ts-expect-error update types
    deserializer: (payload) => {
      const deserialized = produce(payload, (draft) => {
        // @ts-expect-error update types
        draft.inputs[0].streams = draft.inputs[0].streams.map(({ data_stream, enabled, vars }) => ({
          data: {
            data_stream,
            enabled,
            vars,
          },
        }));
      });

      console.error('dsss', deserialized);

      return deserialized;
    },
    // @ts-expect-error update types
    serializer: (payload) => {
      // console.error('serialized payload', payload);

      const serialized = produce(payload, (draft) => {
        if (draft.inputs) {
          // @ts-expect-error update types
          draft.inputs[0].type = 'osquery';
          // @ts-expect-error update types
          draft.inputs[0].streams = draft.inputs[0].streams.map((stream) => stream.data);
        }
      });

      console.error('serialized', serialized, payload);

      return serialized;
    },

    // omit(['id', 'revision', 'created_at', 'created_by', 'updated_at', 'updated_by', 'version'], {
    //   ...data,
    //   ...payload,
    //   // @ts-expect-error update types
    //   inputs: [{ type: 'osquery', ...((payload.inputs && payload.inputs[0]) ?? {}) }],
    // }),
  });

  const { subscribe } = form;

  // const [formData] = useFormData({ form });

  // console.error('aaaa', formData);

  // useEffect(() => {
  // }, [form]);

  useEffect(() => {
    const subscription = subscribe(({ isValid, validate, data: formData }) => {
      if (!deepEqual(formData.format(), data)) {
        console.error('formData', formData, formData.format(), isValid, validate);
        handleChange({
          isValid: true,
          updatedPolicy: formData.format(),
        });
      }
      // handleChange()
      // const isFormValid = isValid ?? (await validate());
      // if (isFormValid) {
      //   setFormData(data.format() as Pipeline);
      // }
    });

    return subscription.unsubscribe;
  }, [data, handleChange, subscribe]);

  return (
    <Form form={form}>
      <CommonUseField path="inputs[0].enabled" component={ToggleField} />
      <EuiHorizontalRule />
      <EuiSpacer />
      <UseArray path="inputs[0].streams" readDefaultValueOnForm={true}>
        {({ items, form: streamsForm, addItem, removeItem }) => {
          console.error('tiemss', items);
          return (
            <>
              {items.map((item) => {
                // console.error('duipa', !item.isNew && get(item.path, streamsForm.getFormData()));
                console.error(
                  'vaaaa',
                  get(item.path, streamsForm.getFormData()),
                  get(item.path, data)
                );
                return (
                  <UseField
                    key={item.path}
                    path={`${item.path}.data`}
                    component={OsqueryStreamField}
                    // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
                    removeItem={() => removeItem(item.id)}
                    // readDefaultValueOnForm={true}
                    defaultValue={
                      item.isNew
                        ? // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                          {
                            data_stream: {
                              type: 'logs',
                              dataset: 'osquery_elastic_managed.osquery',
                            },
                            vars: {
                              query: {
                                type: 'text',
                                value: 'select * from uptime',
                              },
                              interval: {
                                type: 'text',
                                value: '120',
                              },
                              id: {
                                type: 'text',
                                value: uuid.v4(),
                              },
                            },
                            enabled: true,
                          }
                        : get(item.path, streamsForm.getFormData())
                    }
                  />
                );
              })}
              <EuiButtonEmpty onClick={addItem} iconType="plusInCircleFilled">
                {'Add query'}
              </EuiButtonEmpty>
            </>
          );
        }}
      </UseArray>
    </Form>
  );
};

export const EditScheduledQueryForm = React.memo(
  EditScheduledQueryFormComponent,
  (prevProps, nextProps) => true
);

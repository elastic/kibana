/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import produce from 'immer';
import { get, omit } from 'lodash/fp';
import { EuiButton, EuiButtonEmpty, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import uuid from 'uuid';
import React, { useMemo } from 'react';

import {
  UseField,
  useForm,
  UseArray,
  getUseField,
  Field,
  ToggleField,
  Form,
} from '../../shared_imports';

import { OsqueryStreamField } from '../common/osquery_stream_field';
import { schema } from './schema';

const CommonUseField = getUseField({ component: Field });

const EDIT_SCHEDULED_QUERY_FORM_ID = 'editScheduledQueryForm';

interface EditScheduledQueryFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentPolicies: Array<Record<string, any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
  handleSubmit: () => Promise<void>;
}

const EditScheduledQueryFormComponent: React.FC<EditScheduledQueryFormProps> = ({
  agentPolicies,
  data,
  handleSubmit,
}) => {
  const agentPoliciesOptions = useMemo(
    () =>
      agentPolicies.map((policy) => ({
        value: policy.id,
        text: policy.name,
      })),
    [agentPolicies]
  );

  const { form } = useForm({
    schema,
    id: EDIT_SCHEDULED_QUERY_FORM_ID,
    onSubmit: handleSubmit,
    defaultValue: data,
    // @ts-expect-error update types
    deserializer: (payload) => {
      const deserialized = produce(payload, (draft) => {
        // @ts-expect-error update types
        draft.inputs[0].streams.forEach((stream) => {
          delete stream.compiled_stream;
        });
      });

      return deserialized;
    },
    // @ts-expect-error update types
    serializer: (payload) =>
      omit(['id', 'revision', 'created_at', 'created_by', 'updated_at', 'updated_by', 'version'], {
        ...data,
        ...payload,
        // @ts-expect-error update types
        inputs: [{ type: 'osquery', ...((payload.inputs && payload.inputs[0]) ?? {}) }],
      }),
  });

  const { submit } = form;

  const policyIdComponentProps = useMemo(
    () => ({
      euiFieldProps: {
        disabled: true,
        options: agentPoliciesOptions,
      },
    }),
    [agentPoliciesOptions]
  );

  return (
    <Form form={form}>
      <CommonUseField path="policy_id" componentProps={policyIdComponentProps} />
      <EuiSpacer />
      <CommonUseField path="name" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <CommonUseField path="inputs[0].enabled" component={ToggleField} />
      <EuiHorizontalRule />
      <EuiSpacer />
      <UseArray path="inputs[0].streams">
        {({ items, addItem, removeItem }) => (
          <>
            {items.map((item) => (
              <UseField
                key={item.path}
                path={item.path}
                component={OsqueryStreamField}
                // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
                removeItem={() => removeItem(item.id)}
                defaultValue={
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  get(item.path, form.getFormData()) ?? {
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
                }
              />
            ))}
            <EuiButtonEmpty onClick={addItem} iconType="plusInCircleFilled">
              {'Add query'}
            </EuiButtonEmpty>
          </>
        )}
      </UseArray>
      <EuiHorizontalRule />
      <EuiSpacer />
      <EuiButton fill onClick={submit}>
        Save
      </EuiButton>
    </Form>
  );
};

export const EditScheduledQueryForm = React.memo(EditScheduledQueryFormComponent);

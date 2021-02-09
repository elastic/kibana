/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import produce from 'immer';
import { get, omit } from 'lodash/fp';
import {
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiForm,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import uuid from 'uuid';
import React, { useCallback, useMemo } from 'react';
import { useQuery } from 'react-query';

import {
  UseField,
  useForm,
  UseArray,
  getUseField,
  Field,
  ToggleField,
  Form,
  FIELD_TYPES,
} from '../../shared_imports';

import { OsqueryStreamField } from '../common/osquery_stream_field';

const CommonUseField = getUseField({ component: Field });

const EDIT_SCHEDULED_QUERY_FORM_ID = 'editScheduledQueryForm';

const schema = {
  policy_id: {
    type: FIELD_TYPES.SELECT,
    label: 'Policy',
  },
  name: {
    type: FIELD_TYPES.TEXT,
    label: 'Name',
  },
  description: {
    type: FIELD_TYPES.TEXT,
    label: 'Description',
  },
  streams: {
    type: FIELD_TYPES.MULTI_SELECT,
  },
};

const EditScheduledQueryFormComponent = ({ data, agentPolicies, handleSubmit }) => {
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
    deserializer: (payload) => {
      const deserialized = produce(payload, (draft) => {
        draft.inputs[0].streams.forEach((stream) => {
          delete stream.compiled_stream;
        });
      });

      return deserialized;
    },
    serializer: (payload) => {
      console.error('serri', { ...data, ...payload });

      return omit(
        ['id', 'revision', 'created_at', 'created_by', 'updated_at', 'updated_by', 'version'],
        {
          ...data,
          ...payload,
          inputs: [{ type: 'osquery', ...((payload.inputs && payload.inputs[0]) ?? {}) }],
        }
      );
    },
  });

  const { submit } = form;

  return (
    <Form form={form}>
      <CommonUseField
        path="policy_id"
        componentProps={{
          euiFieldProps: {
            disabled: true,
            options: agentPoliciesOptions,
          },
        }}
      />
      <EuiSpacer />
      <CommonUseField path="name" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <CommonUseField path="inputs[0].enabled" component={ToggleField} />
      <EuiHorizontalRule />
      <EuiSpacer />
      <UseArray path="inputs[0].streams">
        {({ items, error, form, addItem, removeItem }) => (
          <>
            {items.map((item) => (
              <UseField
                key={item.path}
                path={item.path}
                component={OsqueryStreamField}
                removeItem={() => removeItem(item.id)}
                defaultValue={
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

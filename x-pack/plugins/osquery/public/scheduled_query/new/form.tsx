/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiForm,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import React from 'react';

import {
  useForm,
  UseArray,
  getUseField,
  Field,
  ToggleField,
  Form,
  FIELD_TYPES,
} from '../../shared_imports';

const CommonUseField = getUseField({ component: Field });

const NEW_SCHEDULED_QUERY_FORM_ID = 'newScheduledQueryForm';

const defaultValue = {
  name: 'osquery_elastic_managed-8',
  description: '',
  namespace: 'default',
  enabled: true,
  policy_id: '1e2bb670-686c-11eb-84b4-81282a213fcf',
  output_id: '',
  package: {
    name: 'osquery_elastic_managed',
    title: 'OSquery Elastic Managed',
    version: '0.1.2',
  },
  inputs: [
    {
      type: 'osquery',
      enabled: true,
      streams: [
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
              value: '777-777',
            },
          },
          enabled: true,
        },
      ],
    },
  ],
};

const schema = {
  name: {
    type: FIELD_TYPES.TEXT,
    label: 'Name',
  },
  description: {
    type: FIELD_TYPES.TEXT,
    label: 'Description',
  },
  namespace: {
    type: FIELD_TYPES.TEXT,
  },
  enabled: {
    type: FIELD_TYPES.TOGGLE,
  },
  policy_id: {
    type: FIELD_TYPES.TEXT,
  },
  inputs: {
    enabled: {
      type: FIELD_TYPES.TOGGLE,
    },
    streams: {
      type: FIELD_TYPES.MULTI_SELECT,
      vars: {
        query: {
          type: {
            type: FIELD_TYPES.TEXT,
          },
          value: {
            type: FIELD_TYPES.TEXT,
          },
        },
      },
    },
  },
};

const NewScheduledQueryFormComponent = ({ handleSubmit }) => {
  const { form } = useForm({
    schema,
    id: NEW_SCHEDULED_QUERY_FORM_ID,
    options: {
      stripEmptyFields: false,
    },
    // onSubmit: handleSubmit,
    defaultValue,
    deserializer: (payload) => {
      console.error('poayload', payload);
      return {
        ...payload,
        streams: payload.inputs[0].streams,
      };
    },
    serializer: (payload) => {
      const { streams, ...rest } = payload;
      console.error('serializer,', payload);

      return {
        ...defaultValue,
        ...rest,
        inputs: [
          {
            type: 'osquery',
            enabled: true,
            streams: streams.map((stream) => ({
              ...stream,
              data_stream: {
                type: 'logs',
                dataset: 'osquery_elastic_managed.osquery',
              },
            })),
          },
        ],
      };
    },
  });
  const { submit } = form;
  return (
    <Form form={form}>
      <CommonUseField path="name" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <UseArray path="inputs[0].streams">
        {({ items, error, form, addItem, removeItem }) => {
          return (
            <>
              {items.map((item) => (
                <EuiForm key={item.path}>
                  <CommonUseField path={`${item.path}.enabled`} component={ToggleField} />
                  <EuiButtonIcon
                    onClick={() => removeItem(item.id)}
                    color="danger"
                    iconType="trash"
                  />
                  <CommonUseField path={`${item.path}.vars.query.value`} />
                  <EuiSpacer />
                  <CommonUseField path={`${item.path}.vars.interval.type`} />
                  <CommonUseField path={`${item.path}.vars.interval.value`} />
                  <EuiSpacer />
                  <CommonUseField path={`${item.path}.vars.id.type`} />
                  <CommonUseField path={`${item.path}.vars.id.value`} />
                  <EuiHorizontalRule />
                </EuiForm>
              ))}
              <EuiButtonEmpty onClick={addItem} iconType="plusInCircleFilled">
                {'Add query'}
              </EuiButtonEmpty>
            </>
          );
        }}
      </UseArray>
      <EuiSpacer />
      <EuiButton fill onClick={submit}>
        Save
      </EuiButton>
    </Form>
  );
};

export const NewScheduledQueryForm = React.memo(NewScheduledQueryFormComponent);

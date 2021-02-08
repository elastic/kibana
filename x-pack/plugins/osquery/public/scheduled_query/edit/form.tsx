/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiButtonEmpty, EuiForm, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import React, { useMemo } from 'react';

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

const EditScheduledQueryFormComponent = ({ data, agentPolicies }) => {
  const agentPoliciesOptions = useMemo(
    () =>
      agentPolicies.reverse().map((policy) => ({
        value: policy.id,
        text: policy.name,
      })),
    [agentPolicies]
  );

  const { form } = useForm({
    schema,
    id: EDIT_SCHEDULED_QUERY_FORM_ID,
    defaultValue: data,
    deserializer: (payload) => {
      console.error('poayload', payload);
      return {
        ...payload,
        streams: payload.inputs[0].streams,
      };
    },
    serializer: (payload) => {
      console.error('serializer,', payload);
      return payload;
    },
  });
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
      <UseArray path="streams">
        {({ items, error, form, addItem, removeItem }) => (
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
                <CommonUseField path={`${item.path}.vars.interval.value`} />
                <EuiSpacer />
                <CommonUseField path={`${item.path}.vars.id.value`} />
                <EuiHorizontalRule />
              </EuiForm>
            ))}
            <EuiButtonEmpty onClick={addItem} iconType="plusInCircleFilled">
              {'Add query'}
            </EuiButtonEmpty>
          </>
        )}
      </UseArray>
    </Form>
  );
};

export const EditScheduledQueryForm = React.memo(EditScheduledQueryFormComponent);

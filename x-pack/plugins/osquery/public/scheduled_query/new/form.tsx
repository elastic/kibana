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
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiHorizontalRule,
} from '@elastic/eui';
import deepmerge from 'deepmerge';
import React, { useCallback, useEffect } from 'react';
import uuid from 'uuid';

import {
  useForm,
  UseArray,
  UseField,
  getUseField,
  Field,
  FieldHook,
  ToggleField,
  Form,
  FIELD_TYPES,
} from '../../shared_imports';

import { OsqueryStreamField } from '../common/osquery_stream_field';

const CommonUseField = getUseField({ component: Field });

const NEW_SCHEDULED_QUERY_FORM_ID = 'newScheduledQueryForm';

const defaultStreamValue = {
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
};

const defaultValue = {
  name: '',
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
      streams: [],
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

const combineMerge = (target, source, options) => {
  const destination = target.slice();

  source.forEach((item, index) => {
    if (typeof destination[index] === 'undefined') {
      destination[index] = options.cloneUnlessOtherwiseSpecified(item, options);
    } else if (options.isMergeableObject(item)) {
      destination[index] = deepmerge(target[index], item, options);
    } else if (target.indexOf(item) === -1) {
      destination.push(item);
    }
  });
  return destination;
};

const NewScheduledQueryFormComponent = ({ handleSubmit }) => {
  const { form } = useForm({
    schema,
    id: NEW_SCHEDULED_QUERY_FORM_ID,
    options: {
      stripEmptyFields: false,
    },
    onSubmit: handleSubmit,
    defaultValue,
    serializer: (payload) => {
      console.error('serializer,', payload);

      return deepmerge(defaultValue, payload, {
        arrayMerge: combineMerge,
      });
    },
  });
  const { submit } = form;

  return (
    <Form form={form}>
      <CommonUseField path="name" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <UseArray path="inputs[0].streams" initialNumberOfItems={1} readDefaultValueOnForm={false}>
        {({ items, error, form, addItem, removeItem }) => {
          console.error('items', items);
          return (
            <>
              {items.map((item) => (
                <UseField
                  key={item.path}
                  path={item.path}
                  component={OsqueryStreamField}
                  removeItem={() => removeItem(item.id)}
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

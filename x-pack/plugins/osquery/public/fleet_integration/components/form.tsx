/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import produce from 'immer';
import { find } from 'lodash/fp';
import { EuiSpacer, EuiText, EuiHorizontalRule, EuiSuperSelect } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import { useQuery } from 'react-query';

import {
  // UseField,
  useForm,
  useFormData,
  UseArray,
  getUseField,
  Field,
  ToggleField,
  Form,
} from '../../shared_imports';

// import { OsqueryStreamField } from '../../scheduled_query/common/osquery_stream_field';
import { useKibana } from '../../common/lib/kibana';
import { ScheduledQueryQueriesTable } from './scheduled_queries_table';
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
}) => {
  const { http } = useKibana().services;

  const {
    data: { saved_objects: packs } = {
      saved_objects: [],
    },
  } = useQuery('packs', () => http.get('/internal/osquery/pack'));

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
        draft.streams = draft.inputs[0].streams.map(({ data_stream, enabled, vars }) => ({
          data: {
            data_stream,
            enabled,
            vars,
          },
        }));
      });

      return deserialized;
    },
    // @ts-expect-error update types
    serializer: (payload) => {
      const serialized = produce(payload, (draft) => {
        // @ts-expect-error update types
        if (draft.inputs) {
          // @ts-expect-error update types
          draft.inputs[0].config = {
            pack: {
              type: 'id',
              value: 'e33f5f30-705e-11eb-9e99-9f6b4d0d9506',
            },
          };
          // @ts-expect-error update types
          draft.inputs[0].type = 'osquery';
          // @ts-expect-error update types
          draft.inputs[0].streams = draft.inputs[0].streams?.map((stream) => stream.data) ?? [];
        }
      });

      return serialized;
    },
  });

  const { setFieldValue } = form;

  const handlePackChange = useCallback(
    (value) => {
      const newPack = find(['id', value], packs);

      setFieldValue(
        'streams',
        // @ts-expect-error update types
        newPack.queries.map((packQuery, index) => ({
          id: index,
          isNew: true,
          path: `streams[${index}]`,
          data: {
            data_stream: {
              type: 'logs',
              dataset: 'osquery_elastic_managed.osquery',
            },
            id: 'osquery-osquery_elastic_managed.osquery-7065c2dc-f835-4d13-9486-6eec515f39bd',
            vars: {
              query: {
                type: 'text',
                value: packQuery.query,
              },
              interval: {
                type: 'text',
                value: `${packQuery.interval}`,
              },
              id: {
                type: 'text',
                value: packQuery.id,
              },
            },
            enabled: true,
          },
        }))
      );
    },
    [packs, setFieldValue]
  );

  const [formData] = useFormData({ form, watch: ['streams'] });

  const scheduledQueries = useMemo(() => {
    if (formData.inputs) {
      // @ts-expect-error update types
      return formData.streams.reduce((acc, stream) => {
        if (!stream.data) {
          return acc;
        }

        return [...acc, stream.data];
      }, []);
    }

    return [];
  }, [formData]);

  return (
    <Form form={form}>
      <EuiSuperSelect
        // @ts-expect-error update types
        options={packs.map((pack) => ({
          value: pack.id,
          inputDisplay: (
            <>
              <EuiText>{pack.name}</EuiText>
              <EuiText size="s" color="subdued">
                <p className="euiTextColor--subdued">{pack.description}</p>
              </EuiText>
            </>
          ),
        }))}
        valueOfSelected={packs[0]?.id}
        onChange={handlePackChange}
      />
      <ScheduledQueryQueriesTable data={scheduledQueries} />
      <CommonUseField path="enabled" component={ToggleField} />
      <EuiHorizontalRule />
      <EuiSpacer />
      <UseArray path="streams" readDefaultValueOnForm={true}>
        {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ items, form: streamsForm, addItem, removeItem }) => {
            return (
              <>
                {/* {items.map((item) => {
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
              })} */}
                {/* <EuiButtonEmpty onClick={addItem} iconType="plusInCircleFilled">
                {'Add query'}
              </EuiButtonEmpty> */}
              </>
            );
          }
        }
      </UseArray>
    </Form>
  );
};

export const EditScheduledQueryForm = React.memo(
  EditScheduledQueryFormComponent,
  (prevProps, nextProps) => deepEqual(prevProps.data, nextProps.data)
);

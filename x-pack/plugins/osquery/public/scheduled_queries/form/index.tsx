/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop, react/display-name */

import { merge } from 'lodash/fp';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiDescribedFormGroup,
  EuiLink,
  EuiSpacer,
  EuiAccordion,
  EuiBottomBar,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { useMutation } from 'react-query';
import deepmerge from 'deepmerge';
import { produce } from 'immer';
import styled from 'styled-components';

import {
  UseField,
  Form,
  useForm,
  getUseField,
  Field,
  FIELD_TYPES,
  useFormData,
} from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';
import { PolicyIdComboBoxField } from './policy_id_combobox_field';
import { QueriesField } from './queries_field';

const GhostFormField = () => <></>;

const FORM_ID = 'scheduledQueryForm';

const CommonUseField = getUseField({ component: Field });

const ScheduledQueryFormComponent = ({ defaultValue, editMode = false }) => {
  const { http } = useKibana().services;

  const {
    data,
    isLoading,
    mutateAsync,
    isError,
    isSuccess,
    // error
  } = useMutation(
    (payload: Record<string, unknown>) =>
      editMode
        ? http.put(`/api/fleet/package_policies/${defaultValue.id}`, {
            body: JSON.stringify(payload),
          })
        : http.post('/api/fleet/package_policies', {
            body: JSON.stringify(payload),
          }),
    {
      onSuccess: () => {},
    }
  );

  const { form } = useForm({
    id: FORM_ID,
    schema: {
      name: {
        type: FIELD_TYPES.TEXT,
        label: 'Name',
      },
      description: {
        type: FIELD_TYPES.TEXT,
        label: 'Description',
      },
      namespace: {
        type: FIELD_TYPES.COMBO_BOX,
        label: 'Namespace',
      },
      policy_id: {
        type: FIELD_TYPES.COMBO_BOX,
        label: 'Agent policy',
      },
    },
    onSubmit: (payload) => {
      console.error('payload', payload);
      const formData = produce(payload, (draft) => {
        draft.inputs[0].streams.forEach((stream) => {
          delete stream.compiled_stream;
        });
        return draft;
      });
      return mutateAsync(formData);
    },
    options: {
      stripEmptyFields: false,
    },
    deserializer: (payload) => {
      console.error('deserializer', payload);
      return {
        ...payload,
        policy_id: [payload.policy_id],
        namespace: [payload.namespace],
      };
    },
    serializer: (payload) => {
      console.error('serializer', payload);
      return {
        ...payload,
        policy_id: payload.policy_id[0],
        namespace: payload.namespace[0],
      };
    },
    defaultValue: merge(
      {
        name: '',
        description: '',
        enabled: true,
        policy_id: [''],
        namespace: 'default',
        output_id: '',
        package: {
          name: 'osquery_manager',
          title: 'Osquery Manager',
          version: '0.1.4',
        },
        inputs: [
          {
            type: 'osquery',
            enabled: true,
            streams: [],
          },
        ],
      },
      defaultValue ?? {}
    ),
  });

  const { submit } = form;

  // const [formData] = useFormData({ form, watch: ['policy_id'] });

  return (
    <>
      <Form form={form}>
        <EuiDescribedFormGroup
          title={<h3>Scheduled query settings</h3>}
          fullWidth
          description={
            <>
              A single text field that can be used to display additional text. It can have{' '}
              <EuiLink href="http://www.elastic.co" target="_blank">
                links
              </EuiLink>{' '}
              or any other type of content.
            </>
          }
        >
          <CommonUseField path="name" />

          <CommonUseField path="description" />

          <CommonUseField path="policy_id" component={PolicyIdComboBoxField} />

          <EuiSpacer />
          <EuiAccordion id="accordion1" buttonContent="Advanced">
            <CommonUseField path="namespace" />
          </EuiAccordion>
        </EuiDescribedFormGroup>

        <CommonUseField path="enabled" />
        <CommonUseField path="inputs" component={QueriesField} />

        <CommonUseField path="output_id" component={GhostFormField} />
        <CommonUseField path="package" component={GhostFormField} />
      </Form>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiBottomBar>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="ghost" size="s">
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={isLoading}
                  color="primary"
                  fill
                  size="m"
                  iconType="save"
                  onClick={submit}
                >
                  Save query
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    </>
  );
};

export const ScheduledQueryForm = React.memo(ScheduledQueryFormComponent);

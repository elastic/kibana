/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  EuiHorizontalRule,
} from '@elastic/eui';
import React from 'react';
import { useMutation } from 'react-query';
import { produce } from 'immer';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { Form, useForm, getUseField, Field, FIELD_TYPES } from '../../shared_imports';
import { useKibana, useRouterNavigate } from '../../common/lib/kibana';
import { PolicyIdComboBoxField } from './policy_id_combobox_field';
import { QueriesField } from './queries_field';

const GhostFormField = () => <></>;

const FORM_ID = 'scheduledQueryForm';

const CommonUseField = getUseField({ component: Field });

interface ScheduledQueryFormProps {
  defaultValue?: Record<string, unknown>;
  editMode?: boolean;
}

const ScheduledQueryFormComponent: React.FC<ScheduledQueryFormProps> = ({
  defaultValue,
  editMode = false,
}) => {
  const { http } = useKibana().services;

  const cancelButtonProps = useRouterNavigate(
    `scheduled_queries/${editMode ? defaultValue?.id : ''}`
  );

  const {
    // data,
    isLoading,
    mutateAsync,
    // isError,
    // isSuccess,
    // error
  } = useMutation(
    (payload: Record<string, unknown>) =>
      editMode
        ? http.put(`/api/fleet/package_policies/${defaultValue?.id}`, {
            body: JSON.stringify(payload),
          })
        : http.post('/api/fleet/package_policies', {
            body: JSON.stringify(payload),
          })
    // {
    //   onSuccess: () => {},
    // }
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
      integration_type: {
        type: FIELD_TYPES.RADIO_GROUP,
        label: 'Integration type',
      },
    },
    onSubmit: (payload) => {
      // console.error('payload', payload);
      const formData = produce(payload, (draft) => {
        // @ts-expect-error update types
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
    // @ts-expect-error update types
    deserializer: (payload) => {
      // console.error('deserializer', payload);
      return {
        ...payload,
        policy_id: payload.policy_id.length ? [payload.policy_id] : [],
        namespace: [payload.namespace],
      };
    },
    serializer: (payload) => {
      // console.error('serializer', payload);
      return {
        ...payload,
        // @ts-expect-error update types
        policy_id: payload.policy_id[0],
        // @ts-expect-error update types
        namespace: payload.namespace[0],
      };
    },
    defaultValue: merge(
      {
        name: '',
        description: '',
        enabled: true,
        policy_id: [],
        namespace: 'default',
        output_id: '',
        package: {
          name: OSQUERY_INTEGRATION_NAME,
          title: 'Osquery Manager',
          version: '0.1.0',
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

          <CommonUseField
            path="policy_id"
            disabled={!!defaultValue}
            component={PolicyIdComboBoxField}
          />

          <EuiSpacer />
          <EuiAccordion id="accordion1" buttonContent="Advanced">
            <CommonUseField path="namespace" />
          </EuiAccordion>
        </EuiDescribedFormGroup>

        <EuiHorizontalRule />

        <CommonUseField path="inputs" component={QueriesField} />

        <CommonUseField path="enabled" component={GhostFormField} />
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
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="ghost" {...cancelButtonProps}>
                  {'Cancel'}
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
                  {'Save query'}
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

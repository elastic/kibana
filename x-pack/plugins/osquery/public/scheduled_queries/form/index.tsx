/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys } from 'lodash';
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
import React, { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { produce } from 'immer';

import {
  PackagePolicy,
  PackagePolicyPackage,
  packagePolicyRouteService,
} from '../../../../fleet/common';
import { Form, useForm, useFormData, getUseField, Field, FIELD_TYPES } from '../../shared_imports';
import { useKibana, useRouterNavigate } from '../../common/lib/kibana';
import { PolicyIdComboBoxField } from './policy_id_combobox_field';
import { QueriesField } from './queries_field';
import { ConfirmDeployAgentPolicyModal } from './confirmation_modal';
import { useAgentPolicies } from '../../agent_policies';

const GhostFormField = () => <></>;

const FORM_ID = 'scheduledQueryForm';

const CommonUseField = getUseField({ component: Field });

interface ScheduledQueryFormProps {
  defaultValue?: PackagePolicy;
  packageInfo?: PackagePolicyPackage;
  editMode?: boolean;
}

const ScheduledQueryFormComponent: React.FC<ScheduledQueryFormProps> = ({
  defaultValue,
  packageInfo,
  editMode = false,
}) => {
  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const handleHideConfirmationModal = useCallback(() => setShowConfirmationModal(false), []);

  const { data: agentPolicies = [] } = useAgentPolicies();
  const agentPoliciesById = mapKeys(agentPolicies, 'id');
  const agentPolicyOptions = useMemo(
    () =>
      // @ts-expect-error update types
      agentPolicies.map((agentPolicy) => ({
        key: agentPolicy.id,
        label: agentPolicy.id,
      })),
    [agentPolicies]
  );

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
      editMode && defaultValue?.id
        ? http.put(packagePolicyRouteService.getUpdatePath(defaultValue.id), {
            body: JSON.stringify(payload),
          })
        : http.post(packagePolicyRouteService.getCreatePath(), {
            body: JSON.stringify(payload),
          }),
    {
      onSuccess: (data) => {
        if (!editMode) {
          navigateToApp('osquery', { path: `scheduled_queries/${data.item.id}` });
          toasts.addSuccess(`Successfully scheduled '${data.item.name}'`);
          return;
        }

        navigateToApp('osquery', { path: `scheduled_queries/${data.item.id}` });
        toasts.addSuccess(`Successfully updated '${data.item.name}'`);
      },
      onError: (error) => {
        // @ts-expect-error update types
        toasts.addError(error, { title: error.body.error, toastMessage: error.body.message });
      },
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
      integration_type: {
        type: FIELD_TYPES.RADIO_GROUP,
        label: 'Integration type',
      },
    },
    onSubmit: (payload) => {
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
    deserializer: (payload) => ({
      ...payload,
      policy_id: payload.policy_id.length ? [payload.policy_id] : [],
      namespace: [payload.namespace],
    }),
    serializer: (payload) => ({
      ...payload,
      // @ts-expect-error update types
      policy_id: payload.policy_id[0],
      // @ts-expect-error update types
      namespace: payload.namespace[0],
    }),
    defaultValue: merge(
      {
        name: '',
        description: '',
        enabled: true,
        policy_id: [],
        namespace: 'default',
        output_id: '',
        package: packageInfo,
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

  const policyIdEuiFieldProps = useMemo(
    () => ({ isDisabled: !!defaultValue, options: agentPolicyOptions }),
    [defaultValue, agentPolicyOptions]
  );

  const [{ policy_id: policyId }] = useFormData({ form, watch: ['policy_id'] });

  const currentPolicy = useMemo(() => {
    if (!policyId) {
      return {
        agentCount: 0,
        agentPolicy: {},
      };
    }

    const currentAgentPolicy = agentPoliciesById[policyId[0]];
    return {
      agentCount: currentAgentPolicy?.agents ?? 0,
      agentPolicy: currentAgentPolicy,
    };
  }, [agentPoliciesById, policyId]);

  const handleSaveClick = useCallback(() => {
    if (currentPolicy.agentCount) {
      setShowConfirmationModal(true);
      return;
    }

    submit();
  }, [currentPolicy.agentCount, submit]);

  const handleConfirmConfirmationClick = useCallback(() => {
    submit();
    setShowConfirmationModal(false);
  }, [submit]);

  return (
    <>
      <Form form={form}>
        <EuiDescribedFormGroup
          title={<h3>{'Scheduled query group settings'}</h3>}
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
            euiFieldProps={policyIdEuiFieldProps}
            component={PolicyIdComboBoxField}
            agentPoliciesById={agentPoliciesById}
          />

          <EuiSpacer />
          <EuiAccordion id="accordion1" buttonContent="Advanced">
            <CommonUseField path="namespace" />
          </EuiAccordion>
        </EuiDescribedFormGroup>

        <EuiHorizontalRule />

        <CommonUseField
          path="inputs"
          component={QueriesField}
          scheduledQueryId={defaultValue?.id ?? ''}
        />

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
                  onClick={handleSaveClick}
                >
                  {'Save query'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
      {showConfirmationModal && (
        <ConfirmDeployAgentPolicyModal
          onCancel={handleHideConfirmationModal}
          onConfirm={handleConfirmConfirmationClick}
          {...currentPolicy}
        />
      )}
    </>
  );
};

export const ScheduledQueryForm = React.memo(ScheduledQueryFormComponent);

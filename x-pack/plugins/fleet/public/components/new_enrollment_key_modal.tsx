/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiForm, EuiFormRow, EuiFieldText, EuiSelect } from '@elastic/eui';

import type { AgentPolicy, EnrollmentAPIKey } from '../types';
import { useInput, useStartServices, sendCreateEnrollmentAPIKey } from '../hooks';

function useCreateApiKeyForm(
  policyIdDefaultValue: string | undefined,
  onSuccess: (key: EnrollmentAPIKey) => void,
  onError: (error: Error) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const apiKeyNameInput = useInput('');
  const policyIdInput = useInput(policyIdDefaultValue);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const res = await sendCreateEnrollmentAPIKey({
        name: apiKeyNameInput.value,
        policy_id: policyIdInput.value,
      });

      if (res.error) {
        throw res.error;
      }
      policyIdInput.clear();
      apiKeyNameInput.clear();
      setIsLoading(false);
      if (res.data?.item) {
        onSuccess(res.data.item);
      }
    } catch (error) {
      setIsLoading(false);
      onError(error);
    }
  };

  return {
    isLoading,
    onSubmit,
    policyIdInput,
    apiKeyNameInput,
  };
}

interface Props {
  onClose: (key?: EnrollmentAPIKey) => void;
  agentPolicies?: AgentPolicy[];
}

export const NewEnrollmentTokenModal: React.FunctionComponent<Props> = ({
  onClose,
  agentPolicies = [],
}) => {
  const { notifications } = useStartServices();
  const policyIdDefaultValue = agentPolicies.find((agentPolicy) => agentPolicy.is_default)?.id;
  const form = useCreateApiKeyForm(
    policyIdDefaultValue,
    (key: EnrollmentAPIKey) => {
      onClose(key);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.newEnrollmentKey.keyCreatedToasts', {
          defaultMessage: 'Enrollment token created',
        })
      );
    },
    (error: Error) => {
      notifications.toasts.addError(error, {
        title: 'Error',
      });
    }
  );

  const body = (
    <EuiForm>
      <form onSubmit={form.onSubmit}>
        <EuiFormRow
          label={i18n.translate('xpack.fleet.newEnrollmentKey.nameLabel', {
            defaultMessage: 'Name',
          })}
        >
          <EuiFieldText
            required={true}
            name="name"
            autoComplete="off"
            {...form.apiKeyNameInput.props}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.fleet.newEnrollmentKey.policyLabel', {
            defaultMessage: 'Policy',
          })}
        >
          <EuiSelect
            required={true}
            defaultValue={policyIdDefaultValue}
            {...form.policyIdInput.props}
            options={agentPolicies
              .filter((agentPolicy) => !agentPolicy.is_managed)
              .map((agentPolicy) => ({
                value: agentPolicy.id,
                text: agentPolicy.name,
              }))}
          />
        </EuiFormRow>
      </form>
    </EuiForm>
  );

  return (
    <EuiConfirmModal
      isLoading={form.isLoading}
      title={i18n.translate('xpack.fleet.newEnrollmentKey.modalTitle', {
        defaultMessage: 'Create enrollment token',
      })}
      onCancel={() => onClose()}
      cancelButtonText={i18n.translate('xpack.fleet.newEnrollmentKey.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      onConfirm={form.onSubmit}
      confirmButtonText={i18n.translate('xpack.fleet.newEnrollmentKey.submitButton', {
        defaultMessage: 'Create enrollment token',
      })}
    >
      {body}
    </EuiConfirmModal>
  );
};

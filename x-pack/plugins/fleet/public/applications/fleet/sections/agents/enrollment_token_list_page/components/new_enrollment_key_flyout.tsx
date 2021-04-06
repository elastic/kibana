/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutFooter,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import type { AgentPolicy } from '../../../../types';
import { useInput, useStartServices, sendRequest } from '../../../../hooks';
import { enrollmentAPIKeyRouteService } from '../../../../services';

function useCreateApiKeyForm(
  policyIdDefaultValue: string | undefined,
  onSuccess: (keyId: string) => void
) {
  const { notifications } = useStartServices();
  const [isLoading, setIsLoading] = useState(false);
  const apiKeyNameInput = useInput('');
  const policyIdInput = useInput(policyIdDefaultValue);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const res = await sendRequest({
        method: 'post',
        path: enrollmentAPIKeyRouteService.getCreatePath(),
        body: JSON.stringify({
          name: apiKeyNameInput.value,
          policy_id: policyIdInput.value,
        }),
      });
      if (res.error) {
        throw res.error;
      }
      policyIdInput.clear();
      apiKeyNameInput.clear();
      setIsLoading(false);
      onSuccess(res.data.item.id);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.newEnrollmentKey.keyCreatedToasts', {
          defaultMessage: 'Enrollment token created.',
        })
      );
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: 'Error',
      });
      setIsLoading(false);
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
  onClose: () => void;
  agentPolicies: AgentPolicy[];
}

export const NewEnrollmentTokenFlyout: React.FunctionComponent<Props> = ({
  onClose,
  agentPolicies = [],
}) => {
  const policyIdDefaultValue = agentPolicies.find((agentPolicy) => agentPolicy.is_default)?.id;
  const form = useCreateApiKeyForm(policyIdDefaultValue, () => {
    onClose();
  });

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
            options={agentPolicies.map((agentPolicy) => ({
              value: agentPolicy.id,
              text: agentPolicy.name,
            }))}
          />
        </EuiFormRow>
        <EuiButton type="submit" fill isLoading={form.isLoading}>
          <FormattedMessage
            id="xpack.fleet.newEnrollmentKey.submitButton"
            defaultMessage="Create enrollment token"
          />
        </EuiButton>
      </form>
    </EuiForm>
  );

  return (
    <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetNewEnrollmentKeyFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetNewEnrollmentKeyFlyoutTitle">
            <FormattedMessage
              id="xpack.fleet.newEnrollmentKey.flyoutTitle"
              defaultMessage="Create enrollment token"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{body}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.fleet.newEnrollmentKey.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

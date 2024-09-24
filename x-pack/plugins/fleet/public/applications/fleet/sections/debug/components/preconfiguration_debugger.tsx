/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiCode,
  EuiFlexGroup,
  EuiComboBox,
  EuiFlexItem,
  EuiButton,
  EuiLink,
  EuiConfirmModal,
} from '@elastic/eui';
import { useMutation, useQuery } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  sendGetAgentPolicies,
  sendResetAllPreconfiguredAgentPolicies,
  sendResetOnePreconfiguredAgentPolicy,
  useLink,
  useStartServices,
} from '../../../hooks';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../constants';
import { queryClient } from '..';

import { CodeBlock } from './code_block';

const fetchPreconfiguredPolicies = async () => {
  const kuery = `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.is_preconfigured:true`;

  const response = await sendGetAgentPolicies({ kuery, perPage: SO_SEARCH_LIMIT, full: true });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.items ?? [];
};

export const PreconfigurationDebugger: React.FunctionComponent = () => {
  const { getHref } = useLink();
  const { notifications } = useStartServices();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>();
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [isResetAllModalVisible, setIsResetAllModalVisible] = useState(false);

  const preconfiguredPolicies = useQuery(
    ['debug-preconfigured-policies'],
    fetchPreconfiguredPolicies
  );

  const comboBoxOptions =
    preconfiguredPolicies.data?.map((policy) => ({
      label: policy.name,
      value: policy.id,
    })) ?? [];

  const selectedOptions = selectedPolicyId
    ? [comboBoxOptions.find(({ value }) => value === selectedPolicyId)!]
    : [];

  const selectedPolicy = preconfiguredPolicies.data?.find(
    (policy) => policy.id === selectedPolicyId
  );

  const resetOnePolicyMutation = useMutation(async (policyId: string) => {
    const response = await sendResetOnePreconfiguredAgentPolicy(policyId);

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: i18n.translate('xpack.fleet.debug.preconfigurationDebugger.resetError', {
          defaultMessage: 'Error resetting policy',
        }),
        toastMessage: response.error.message,
      });
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess(
      i18n.translate('xpack.fleet.debug.preconfigurationDebugger.resetSuccess', {
        defaultMessage: 'Successfully reset policy',
      })
    );
    queryClient.invalidateQueries(['debug-preconfigured-policies']);
    setSelectedPolicyId(undefined);
    setIsResetModalVisible(false);

    return response.data;
  });

  const resetAllPoliciesMutation = useMutation(async () => {
    const response = await sendResetAllPreconfiguredAgentPolicies();

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: i18n.translate('xpack.fleet.debug.preconfigurationDebugger.resetAllError', {
          defaultMessage: 'Error resetting policies',
        }),
        toastMessage: response.error.message,
      });
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess(
      i18n.translate('xpack.fleet.debug.preconfigurationDebugger.resetAllSuccess', {
        defaultMessage: 'Successfully reset policies',
      })
    );
    queryClient.invalidateQueries(['debug-preconfigured-policies']);
    setSelectedPolicyId(undefined);
    setIsResetAllModalVisible(false);

    return response.data;
  });

  return (
    <>
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="xpack.fleet.debug.preconfigurationDebugger.description"
            defaultMessage="This tool can be used to reset preconfigured policies that are managed via {codeKibanaYml}. This includes Fleet's default policies that may exist in cloud environments."
            values={{ codeKibanaYml: <EuiCode>kibana.yml</EuiCode> }}
          />
        </p>

        <p>
          <FormattedMessage
            id="xpack.fleet.debug.preconfigurationDebugger.resetInstructions"
            defaultMessage='You may reset a single preconfigured policy or use the "Reset all" button to reset all preconfigured policies at once.'
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 400px;
          `}
        >
          <EuiComboBox
            aria-label={i18n.translate('xpack.fleet.debug.preconfigurationDebugger.selectLabel', {
              defaultMessage: 'Select a preconfigured policy',
            })}
            placeholder={i18n.translate('xpack.fleet.debug.preconfigurationDebugger.selectLabel', {
              defaultMessage: 'Select a preconfigured policy',
            })}
            fullWidth
            options={comboBoxOptions}
            singleSelection={{ asPlainText: true }}
            selectedOptions={selectedOptions}
            onChange={(newSelectedOptions) => {
              if (!newSelectedOptions.length) {
                setSelectedPolicyId(undefined);
              } else {
                setSelectedPolicyId(newSelectedOptions[0].value);
              }
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              color="warning"
              isDisabled={!selectedPolicyId}
              onClick={() => setIsResetModalVisible(true)}
            >
              <FormattedMessage
                id="xpack.fleet.debug.preconfigurationDebugger.resetButton"
                defaultMessage="Reset"
              />
            </EuiButton>
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              color="danger"
              isDisabled={!preconfiguredPolicies.data?.length}
              onClick={() => setIsResetAllModalVisible(true)}
            >
              <FormattedMessage
                id="xpack.fleet.debug.preconfigurationDebugger.resetAllButton"
                defaultMessage="Reset all"
              />
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isResetModalVisible && selectedPolicy && selectedPolicyId && (
        <EuiConfirmModal
          title={i18n.translate('xpack.fleet.debug.preconfigurationDebugger.resetModalTitle', {
            defaultMessage: 'Reset {policyName}',
            values: { policyName: selectedPolicy.name },
          })}
          onCancel={() => setIsResetModalVisible(false)}
          onConfirm={() => resetOnePolicyMutation.mutate(selectedPolicyId)}
          isLoading={resetOnePolicyMutation.isLoading}
          cancelButtonText={i18n.translate(
            'xpack.fleet.debug.preconfigurationDebugger.resetModalCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.fleet.debug.preconfigurationDebugger.resetModalConfirm',
            { defaultMessage: 'Reset' }
          )}
        >
          <FormattedMessage
            id="xpack.fleet.debug.preconfigurationDebugger.resetModalBody"
            defaultMessage="Are you sure you want to reset {policyName}?"
            values={{ policyName: selectedPolicy.name }}
          />
        </EuiConfirmModal>
      )}

      {isResetAllModalVisible && (
        <EuiConfirmModal
          title={i18n.translate('xpack.fleet.debug.preconfigurationDebugger.resetAllModalTitle', {
            defaultMessage: 'Reset all preconfigured policies',
          })}
          onCancel={() => setIsResetAllModalVisible(false)}
          onConfirm={() => resetAllPoliciesMutation.mutate()}
          isLoading={resetAllPoliciesMutation.isLoading}
          cancelButtonText={i18n.translate(
            'xpack.fleet.debug.preconfigurationDebugger.resetAllModalCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.fleet.debug.preconfigurationDebugger.resetAllModalConfirm',
            { defaultMessage: 'Reset all' }
          )}
        >
          <FormattedMessage
            id="xpack.fleet.debug.preconfigurationDebugger.resetAllModalBody"
            defaultMessage="Are you sure you want to reset all preconfigured policies?"
          />
        </EuiConfirmModal>
      )}

      {selectedPolicyId && (
        <>
          <EuiSpacer size="m" />
          <EuiLink target="_blank" href={getHref('policy_details', { policyId: selectedPolicyId })}>
            <FormattedMessage
              id="xpack.fleet.debug.preconfigurationDebugger.viewAgentPolicyLink"
              defaultMessage="View Agent Policy in Fleet UI"
            />
          </EuiLink>

          <EuiSpacer size="m" />
          <CodeBlock value={JSON.stringify(selectedPolicy, null, 2)} />
        </>
      )}
    </>
  );
};

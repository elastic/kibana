/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSelect, EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { AgentPolicy, GetEnrollmentAPIKeysResponse } from '../../../../types';
import { sendGetEnrollmentAPIKeys, useCore } from '../../../../hooks';
import { AgentPolicyPackageBadges } from '../agent_policy_package_badges';

type Props = {
  agentPolicies?: AgentPolicy[];
  onAgentPolicyChange?: (key: string) => void;
} & (
  | {
      withKeySelection: true;
      onKeyChange?: (key: string) => void;
    }
  | {
      withKeySelection: false;
    }
);

export const EnrollmentStepAgentPolicy: React.FC<Props> = (props) => {
  const { notifications } = useCore();
  const { withKeySelection, agentPolicies, onAgentPolicyChange } = props;
  const onKeyChange = props.withKeySelection && props.onKeyChange;

  const [isAuthenticationSettingsOpen, setIsAuthenticationSettingsOpen] = useState(false);
  const [enrollmentAPIKeys, setEnrollmentAPIKeys] = useState<GetEnrollmentAPIKeysResponse['list']>(
    []
  );
  const [selectedState, setSelectedState] = useState<{
    agentPolicyId?: string;
    enrollmentAPIKeyId?: string;
  }>({});

  useEffect(
    function triggerOnAgentPolicyChangeEffect() {
      if (onAgentPolicyChange && selectedState.agentPolicyId) {
        onAgentPolicyChange(selectedState.agentPolicyId);
      }
    },
    [selectedState.agentPolicyId, onAgentPolicyChange]
  );

  useEffect(
    function triggerOnKeyChangeEffect() {
      if (!withKeySelection || !onKeyChange) {
        return;
      }

      if (selectedState.enrollmentAPIKeyId) {
        onKeyChange(selectedState.enrollmentAPIKeyId);
      }
    },
    [withKeySelection, onKeyChange, selectedState.enrollmentAPIKeyId]
  );

  useEffect(
    function useDefaultAgentPolicyEffect() {
      if (agentPolicies && agentPolicies.length && !selectedState.agentPolicyId) {
        if (agentPolicies.length === 1) {
          setSelectedState({
            ...selectedState,
            agentPolicyId: agentPolicies[0].id,
          });
          return;
        }

        const defaultAgentPolicy = agentPolicies.find((agentPolicy) => agentPolicy.is_default);
        if (defaultAgentPolicy) {
          setSelectedState({
            ...selectedState,
            agentPolicyId: defaultAgentPolicy.id,
          });
        }
      }
    },
    [agentPolicies, selectedState]
  );

  useEffect(
    function useEnrollmentKeysForAgentPolicyEffect() {
      if (!withKeySelection) {
        return;
      }
      if (!selectedState.agentPolicyId) {
        setEnrollmentAPIKeys([]);
        return;
      }

      async function fetchEnrollmentAPIKeys() {
        try {
          const res = await sendGetEnrollmentAPIKeys({
            page: 1,
            perPage: 10000,
          });
          if (res.error) {
            throw res.error;
          }

          if (!res.data) {
            throw new Error('No data while fetching enrollment API keys');
          }

          setEnrollmentAPIKeys(
            res.data.list.filter((key) => key.policy_id === selectedState.agentPolicyId)
          );
        } catch (error) {
          notifications.toasts.addError(error, {
            title: 'Error',
          });
        }
      }
      fetchEnrollmentAPIKeys();
    },
    [withKeySelection, selectedState.agentPolicyId, notifications.toasts]
  );

  useEffect(
    function useDefaultEnrollmentKeyForAgentPolicyEffect() {
      if (!withKeySelection) {
        return;
      }
      if (
        !selectedState.enrollmentAPIKeyId &&
        enrollmentAPIKeys.length > 0 &&
        enrollmentAPIKeys[0].policy_id === selectedState.agentPolicyId
      ) {
        const enrollmentAPIKeyId = enrollmentAPIKeys[0].id;
        setSelectedState({
          agentPolicyId: selectedState.agentPolicyId,
          enrollmentAPIKeyId,
        });
      }
    },
    [
      withKeySelection,
      enrollmentAPIKeys,
      selectedState.enrollmentAPIKeyId,
      selectedState.agentPolicyId,
    ]
  );

  return (
    <>
      <EuiSelect
        fullWidth
        prepend={
          <EuiText>
            <FormattedMessage
              id="xpack.ingestManager.enrollmentStepAgentPolicy.policySelectLabel"
              defaultMessage="Agent policy"
            />
          </EuiText>
        }
        isLoading={!agentPolicies}
        options={(agentPolicies || []).map((agentPolicy) => ({
          value: agentPolicy.id,
          text: agentPolicy.name,
        }))}
        value={selectedState.agentPolicyId || undefined}
        onChange={(e) =>
          setSelectedState({
            agentPolicyId: e.target.value,
            enrollmentAPIKeyId: undefined,
          })
        }
        aria-label={i18n.translate(
          'xpack.ingestManager.enrollmentStepAgentPolicy.policySelectAriaLabel',
          { defaultMessage: 'Agent policy' }
        )}
      />
      <EuiSpacer size="m" />
      {selectedState.agentPolicyId && (
        <AgentPolicyPackageBadges agentPolicyId={selectedState.agentPolicyId} />
      )}
      {withKeySelection && onKeyChange && (
        <>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            flush="left"
            iconType={isAuthenticationSettingsOpen ? 'arrowDown' : 'arrowRight'}
            onClick={() => setIsAuthenticationSettingsOpen(!isAuthenticationSettingsOpen)}
          >
            <FormattedMessage
              id="xpack.ingestManager.enrollmentStepAgentPolicy.showAuthenticationSettingsButton"
              defaultMessage="Authentication settings"
            />
          </EuiButtonEmpty>
          {isAuthenticationSettingsOpen && (
            <>
              <EuiSpacer size="m" />
              <EuiSelect
                fullWidth
                options={enrollmentAPIKeys.map((key) => ({
                  value: key.id,
                  text: key.name,
                }))}
                value={selectedState.enrollmentAPIKeyId || undefined}
                prepend={
                  <EuiText>
                    <FormattedMessage
                      id="xpack.ingestManager.enrollmentStepAgentPolicy.enrollmentTokenSelectLabel"
                      defaultMessage="Enrollment token"
                    />
                  </EuiText>
                }
                onChange={(e) => {
                  setSelectedState({
                    ...selectedState,
                    enrollmentAPIKeyId: e.target.value,
                  });
                }}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

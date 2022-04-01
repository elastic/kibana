/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useGetSettings, useFleetStatus, useAgentEnrollmentFlyoutData } from '../../hooks';
import { FLEET_SERVER_PACKAGE } from '../../constants';
import type { PackagePolicy, AgentPolicy } from '../../types';

import { Loading } from '..';

import { FlyoutContent, StandaloneFlyout } from './flyout_content';
import { MissingFleetServerHostCallout } from './missing_fleet_server_host_callout';
import type { BaseProps, SelectionType, FlyoutMode } from './types';

import { useIsK8sPolicy, useAgentPolicyWithPackagePolicies } from './hooks';

export interface Props extends BaseProps {
  onClose: () => void;
  defaultMode?: FlyoutMode;
}

export * from './agent_policy_selection';
export * from './agent_policy_select_create';
export * from './flyout_content';
export * from './steps';

export const AgentEnrollmentFlyout: React.FunctionComponent<Props> = ({
  onClose,
  agentPolicy,
  viewDataStep,
  defaultMode = 'managed',
}) => {
  const settings = useGetSettings();
  const fleetServerHosts = settings.data?.item?.fleet_server_hosts || [];

  const fleetStatus = useFleetStatus();
  const findPolicyById = (policies: AgentPolicy[], id: string | undefined) => {
    if (!id) return undefined;
    return policies.find((p) => p.id === id);
  };

  const [selectedPolicyId, setSelectedPolicyId] = useState(agentPolicy?.id);
  const [isFleetServerPolicySelected, setIsFleetServerPolicySelected] = useState<boolean>(false);
  const [mode, setMode] = useState<FlyoutMode>(defaultMode);
  const [selectionType, setSelectionType] = useState<SelectionType>('tabs');

  const {
    agentPolicies,
    isLoadingInitialAgentPolicies,
    isLoadingAgentPolicies,
    refreshAgentPolicies,
  } = useAgentEnrollmentFlyoutData();
  const { agentPolicyWithPackagePolicies } = useAgentPolicyWithPackagePolicies(selectedPolicyId);
  const selectedPolicy = findPolicyById(agentPolicies, selectedPolicyId);

  useEffect(() => {
    if (agentPolicyWithPackagePolicies && setIsFleetServerPolicySelected) {
      if (
        (agentPolicyWithPackagePolicies.package_policies as PackagePolicy[]).some(
          (packagePolicy) => packagePolicy.package?.name === FLEET_SERVER_PACKAGE
        )
      ) {
        setIsFleetServerPolicySelected(true);
      } else {
        setIsFleetServerPolicySelected(false);
      }
    }
  }, [agentPolicyWithPackagePolicies]);

  const { isK8s } = useIsK8sPolicy(
    agentPolicyWithPackagePolicies ? agentPolicyWithPackagePolicies : undefined
  );

  const isLoadingInitialRequest = settings.isLoading && settings.isInitialRequest;

  return (
    <EuiFlyout data-test-subj="agentEnrollmentFlyout" onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentEnrollmentFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentEnrollmentFlyoutTitle">
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.flyoutTitle"
              defaultMessage="Add agent"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.agentDescription"
            defaultMessage="Add Elastic Agents to your hosts to collect data and send it to the Elastic Stack."
          />
        </EuiText>
        {selectionType === 'tabs' ? (
          <>
            <EuiSpacer size="l" />
            <EuiTabs style={{ marginBottom: '-25px' }}>
              <EuiTab
                data-test-subj="managedTab"
                isSelected={mode === 'managed'}
                onClick={() => setMode('managed')}
              >
                <FormattedMessage
                  id="xpack.fleet.agentEnrollment.enrollFleetTabLabel"
                  defaultMessage="Enroll in Fleet"
                />
              </EuiTab>
              <EuiTab
                data-test-subj="standaloneTab"
                isSelected={mode === 'standalone'}
                onClick={() => setMode('standalone')}
              >
                <FormattedMessage
                  id="xpack.fleet.agentEnrollment.enrollStandaloneTabLabel"
                  defaultMessage="Run standalone"
                />
              </EuiTab>
            </EuiTabs>
          </>
        ) : null}
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        banner={
          fleetStatus.isReady &&
          !isLoadingInitialRequest &&
          fleetServerHosts.length === 0 &&
          mode === 'managed' ? (
            <MissingFleetServerHostCallout />
          ) : undefined
        }
      >
        {isLoadingInitialAgentPolicies ? (
          <Loading />
        ) : mode === 'managed' ? (
          <FlyoutContent
            settings={settings.data?.item}
            setSelectedPolicyId={setSelectedPolicyId}
            agentPolicy={agentPolicy}
            selectedPolicy={selectedPolicy}
            agentPolicies={agentPolicies}
            viewDataStep={viewDataStep}
            isFleetServerPolicySelected={isFleetServerPolicySelected}
            isK8s={isK8s}
            refreshAgentPolicies={refreshAgentPolicies}
            isLoadingAgentPolicies={isLoadingAgentPolicies}
            mode={mode}
            setMode={setMode}
            selectionType={selectionType}
            setSelectionType={setSelectionType}
            onClickViewAgents={onClose}
          />
        ) : (
          <StandaloneFlyout
            settings={settings.data?.item}
            agentPolicy={agentPolicy}
            selectedPolicy={selectedPolicy}
            setSelectedPolicyId={setSelectedPolicyId}
            agentPolicies={agentPolicies}
            viewDataStep={viewDataStep}
            isFleetServerPolicySelected={isFleetServerPolicySelected}
            refreshAgentPolicies={refreshAgentPolicies}
            isLoadingAgentPolicies={isLoadingAgentPolicies}
            mode={mode}
            setMode={setMode}
            selectionType={selectionType}
            setSelectionType={setSelectionType}
            onClickViewAgents={onClose}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.closeFlyoutButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

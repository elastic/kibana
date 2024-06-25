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
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  useStartServices,
  useFleetStatus,
  useAgentEnrollmentFlyoutData,
  useFleetServerHostsForPolicy,
} from '../../hooks';
import { FLEET_SERVER_PACKAGE, MAX_FLYOUT_WIDTH } from '../../constants';
import type { PackagePolicy, AgentPolicy } from '../../types';

import { Loading } from '..';

import { Instructions } from './instructions';
import { MissingFleetServerHostCallout } from './missing_fleet_server_host_callout';
import type { FlyOutProps, SelectionType, FlyoutMode } from './types';

import {
  useIsK8sPolicy,
  useAgentPolicyWithPackagePolicies,
  useCloudSecurityIntegration,
} from './hooks';

export * from './agent_policy_selection';
export * from './agent_policy_select_create';
export * from './instructions';
export * from './steps';

export const AgentEnrollmentFlyout: React.FunctionComponent<FlyOutProps> = ({
  onClose,
  agentPolicy,
  defaultMode = 'managed',
  isIntegrationFlow,
  installedPackagePolicy,
}) => {
  const findPolicyById = (policies: AgentPolicy[], id: string | undefined) => {
    if (!id) return undefined;
    return policies.find((p) => p.id === id);
  };

  const fleetStatus = useFleetStatus();
  const { docLinks } = useStartServices();

  const [selectedPolicyId, setSelectedPolicyId] = useState(agentPolicy?.id);
  const [isFleetServerPolicySelected, setIsFleetServerPolicySelected] = useState<boolean>(false);
  const [selectedApiKeyId, setSelectedAPIKeyId] = useState<string | undefined>();
  const [mode, setMode] = useState<FlyoutMode>(defaultMode);
  const [selectionType, setSelectionType] = useState<SelectionType>();

  const {
    agentPolicies,
    isLoadingInitialAgentPolicies,
    isLoadingAgentPolicies,
    refreshAgentPolicies,
  } = useAgentEnrollmentFlyoutData();

  const { agentPolicyWithPackagePolicies } = useAgentPolicyWithPackagePolicies(selectedPolicyId);

  const { fleetServerHost, fleetProxy, downloadSource, isLoadingInitialRequest } =
    useFleetServerHostsForPolicy(agentPolicyWithPackagePolicies);

  const selectedPolicy = agentPolicyWithPackagePolicies
    ? agentPolicyWithPackagePolicies
    : findPolicyById(agentPolicies, selectedPolicyId);

  const hasNoFleetServerHost = fleetStatus.isReady && !fleetServerHost;

  useEffect(() => {
    if (selectedPolicy) {
      if (
        (selectedPolicy.package_policies as PackagePolicy[]).some(
          (packagePolicy) => packagePolicy.package?.name === FLEET_SERVER_PACKAGE
        )
      ) {
        setIsFleetServerPolicySelected(true);
      } else {
        setIsFleetServerPolicySelected(false);
      }
    }
  }, [selectedPolicy, isFleetServerPolicySelected]);

  const { isK8s } = useIsK8sPolicy(selectedPolicy ?? undefined);
  const { cloudSecurityIntegration } = useCloudSecurityIntegration(selectedPolicy ?? undefined);

  return (
    <EuiFlyout data-test-subj="agentEnrollmentFlyout" onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH}>
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentEnrollmentFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentEnrollmentFlyoutTitle">
            {isFleetServerPolicySelected ? (
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.flyoutFleetServerTitle"
                defaultMessage="Add Fleet Server"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.flyoutTitle"
                defaultMessage="Add agent"
              />
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        {isFleetServerPolicySelected ? (
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.instructionstFleetServer"
              defaultMessage="A Fleet Server is required before you can enroll agents with Fleet. Follow the instructions below to set up a Fleet Server. For more information, see the {userGuideLink}"
              values={{
                userGuideLink: (
                  <EuiLink
                    href={docLinks.links.fleet.fleetServerAddFleetServer}
                    external
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentEnrollment.setupGuideLink"
                      defaultMessage="Fleet and Elastic Agent Guide"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        ) : (
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.agentDescription"
              defaultMessage="Add Elastic Agents to your hosts to collect data and send it to the Elastic Stack."
            />
          </EuiText>
        )}

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
          hasNoFleetServerHost && !isLoadingInitialRequest && mode === 'managed' ? (
            <MissingFleetServerHostCallout />
          ) : undefined
        }
      >
        {isLoadingInitialAgentPolicies || isLoadingAgentPolicies ? (
          <Loading size="l" />
        ) : (
          <Instructions
            fleetServerHost={fleetServerHost}
            fleetProxy={fleetProxy}
            downloadSource={downloadSource}
            setSelectedPolicyId={setSelectedPolicyId}
            agentPolicy={agentPolicy}
            selectedPolicy={selectedPolicy}
            agentPolicies={agentPolicies}
            isFleetServerPolicySelected={isFleetServerPolicySelected}
            isK8s={isK8s}
            cloudSecurityIntegration={cloudSecurityIntegration}
            refreshAgentPolicies={refreshAgentPolicies}
            isLoadingAgentPolicies={isLoadingAgentPolicies}
            mode={mode}
            setMode={setMode}
            selectionType={selectionType}
            setSelectionType={setSelectionType}
            isIntegrationFlow={isIntegrationFlow}
            selectedApiKeyId={selectedApiKeyId}
            setSelectedAPIKeyId={setSelectedAPIKeyId}
            onClickViewAgents={onClose}
            installedPackagePolicy={installedPackagePolicy}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect } from 'react';

import { EuiSteps, EuiLoadingSpinner } from '@elastic/eui';
import { safeDump } from 'js-yaml';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { FullAgentPolicy } from '../../../../common/types/models/agent_policy';
import { API_VERSIONS } from '../../../../common/constants';
import { fullAgentPolicyToYaml, agentPolicyRouteService } from '../../../services';

import { getGcpIntegrationDetailsFromAgentPolicy } from '../../cloud_security_posture/services';

import { StandaloneInstructions, ManualInstructions } from '../../enrollment_instructions';

import {
  useGetOneEnrollmentAPIKey,
  useStartServices,
  sendGetOneAgentPolicyFull,
  useAgentVersion,
} from '../../../hooks';

import type { InstructionProps } from '../types';
import { usePollingAgentCount } from '../confirm_agent_enrollment';

import {
  InstallCloudFormationManagedAgentStep,
  InstallGoogleCloudShellManagedAgentStep,
  InstallAzureArmTemplateManagedAgentStep,
} from '../../cloud_security_posture';

import {
  InstallationModeSelectionStep,
  AgentEnrollmentKeySelectionStep,
  AgentPolicySelectionStep,
  InstallStandaloneAgentStep,
  ConfigureStandaloneAgentStep,
  AgentEnrollmentConfirmationStep,
  InstallManagedAgentStep,
  IncomingDataConfirmationStep,
} from '.';

export const StandaloneSteps: React.FunctionComponent<InstructionProps> = ({
  agentPolicy,
  agentPolicies,
  selectedPolicy,
  setSelectedPolicyId,
  refreshAgentPolicies,
  mode,
  setMode,
  selectionType,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  isK8s,
  cloudSecurityIntegration,
}) => {
  const core = useStartServices();
  const { notifications } = core;
  const [fullAgentPolicy, setFullAgentPolicy] = useState<FullAgentPolicy | undefined>();
  const [yaml, setYaml] = useState<any | undefined>('');

  let downloadLink = '';

  if (selectedPolicy?.id) {
    downloadLink =
      isK8s === 'IS_KUBERNETES'
        ? core.http.basePath.prepend(
            `${agentPolicyRouteService.getInfoFullDownloadPath(
              selectedPolicy?.id
            )}?kubernetes=true&standalone=true&apiVersion=${API_VERSIONS.public.v1}`
          )
        : core.http.basePath.prepend(
            `${agentPolicyRouteService.getInfoFullDownloadPath(
              selectedPolicy?.id
            )}?standalone=true&apiVersion=${API_VERSIONS.public.v1}`
          );
  }

  useEffect(() => {
    async function fetchFullPolicy() {
      try {
        if (!selectedPolicy?.id) {
          return;
        }
        let query = { standalone: true, kubernetes: false };
        if (isK8s === 'IS_KUBERNETES') {
          query = { standalone: true, kubernetes: true };
        }
        const res = await sendGetOneAgentPolicyFull(selectedPolicy?.id, query);
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching full agent policy');
        }
        setFullAgentPolicy(res.data.item);
      } catch (error) {
        notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
    }
    if (isK8s !== 'IS_LOADING') {
      fetchFullPolicy();
    }
  }, [selectedPolicy, notifications.toasts, isK8s, core.http.basePath]);

  useEffect(() => {
    if (!fullAgentPolicy) {
      return;
    }
    if (isK8s === 'IS_KUBERNETES') {
      if (typeof fullAgentPolicy === 'object') {
        return;
      }
      setYaml(fullAgentPolicy);
    } else {
      if (typeof fullAgentPolicy === 'string') {
        return;
      }
      setYaml(fullAgentPolicyToYaml(fullAgentPolicy, safeDump));
    }
  }, [fullAgentPolicy, isK8s]);

  const agentVersion = useAgentVersion();

  const instructionsSteps = useMemo(() => {
    const standaloneInstallCommands = StandaloneInstructions(agentVersion || '');

    const steps: EuiContainedStepProps[] = !agentPolicy
      ? [
          AgentPolicySelectionStep({
            selectedPolicy,
            agentPolicies,
            selectedApiKeyId,
            setSelectedAPIKeyId,
            setSelectedPolicyId,
            refreshAgentPolicies,
          }),
        ]
      : [];

    if (selectionType === 'radio') {
      steps.push(
        InstallationModeSelectionStep({ selectedPolicyId: selectedPolicy?.id, mode, setMode })
      );
    }

    steps.push(
      ConfigureStandaloneAgentStep({
        isK8s,
        selectedPolicyId: selectedPolicy?.id,
        yaml,
        downloadLink,
      })
    );

    steps.push(
      InstallStandaloneAgentStep({
        installCommand: standaloneInstallCommands,
        isK8s,
        cloudSecurityIntegration,
      })
    );

    return steps;
  }, [
    agentVersion,
    isK8s,
    cloudSecurityIntegration,
    agentPolicy,
    selectedPolicy,
    agentPolicies,
    selectedApiKeyId,
    setSelectedAPIKeyId,
    setSelectedPolicyId,
    refreshAgentPolicies,
    selectionType,
    yaml,
    downloadLink,
    mode,
    setMode,
  ]);

  if (!agentVersion) {
    return <EuiLoadingSpinner />;
  }

  return <EuiSteps steps={instructionsSteps} />;
};

export const ManagedSteps: React.FunctionComponent<InstructionProps> = ({
  agentPolicy,
  agentPolicies,
  selectedPolicy,
  setSelectedPolicyId,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  fleetServerHosts,
  fleetProxy,
  downloadSource,
  refreshAgentPolicies,
  mode,
  setMode,
  selectionType,
  onClickViewAgents,
  isK8s,
  cloudSecurityIntegration,
  installedPackagePolicy,
}) => {
  const core = useStartServices();
  const { docLinks } = core;
  const link = docLinks.links.fleet.troubleshooting;
  const [agentDataConfirmed, setAgentDataConfirmed] = useState<boolean>(false);

  const apiKey = useGetOneEnrollmentAPIKey(selectedApiKeyId);
  const apiKeyData = apiKey?.data;
  const enrollToken = apiKey.data ? apiKey.data.item.api_key : '';

  const enrolledAgentIds = usePollingAgentCount(selectedPolicy?.id || '');

  const agentVersion = useAgentVersion();

  const { gcpProjectId, gcpOrganizationId, gcpAccountType } =
    getGcpIntegrationDetailsFromAgentPolicy(selectedPolicy);

  const fleetServerHost = fleetServerHosts?.[0];

  const installManagedCommands = ManualInstructions({
    apiKey: enrollToken,
    fleetServerHosts,
    fleetProxy,
    downloadSource,
    agentVersion: agentVersion || '',
    gcpProjectId,
    gcpOrganizationId,
    gcpAccountType,
  });

  const instructionsSteps = useMemo(() => {
    const steps: EuiContainedStepProps[] = !agentPolicy
      ? [
          AgentPolicySelectionStep({
            selectedPolicy,
            agentPolicies,
            selectedApiKeyId,
            setSelectedAPIKeyId,
            setSelectedPolicyId,
            refreshAgentPolicies,
          }),
        ]
      : [
          AgentEnrollmentKeySelectionStep({
            selectedPolicy,
            selectedApiKeyId,
            setSelectedAPIKeyId,
          }),
        ];

    if (selectionType === 'radio') {
      steps.push(
        InstallationModeSelectionStep({ selectedPolicyId: selectedPolicy?.id, mode, setMode })
      );
    }

    if (cloudSecurityIntegration?.isCloudFormation) {
      steps.push(
        InstallCloudFormationManagedAgentStep({
          apiKeyData,
          selectedApiKeyId,
          enrollToken,
          cloudSecurityIntegration,
          fleetServerHost,
        })
      );
    } else if (cloudSecurityIntegration?.cloudShellUrl) {
      steps.push(
        InstallGoogleCloudShellManagedAgentStep({
          apiKeyData,
          selectedApiKeyId,
          cloudShellUrl: cloudSecurityIntegration.cloudShellUrl,
          cloudShellCommand: installManagedCommands.googleCloudShell,
          projectId: gcpProjectId,
        })
      );
    } else if (cloudSecurityIntegration?.isAzureArmTemplate) {
      steps.push(
        InstallAzureArmTemplateManagedAgentStep({
          selectedApiKeyId,
          apiKeyData,
          enrollToken,
          cloudSecurityIntegration,
          agentPolicy,
        })
      );
    } else {
      steps.push(
        InstallManagedAgentStep({
          installCommand: installManagedCommands,
          apiKeyData,
          selectedApiKeyId,
          isK8s,
          cloudSecurityIntegration,
          fleetServerHost,
          enrollToken,
        })
      );
    }

    if (selectedApiKeyId && apiKeyData) {
      steps.push(
        AgentEnrollmentConfirmationStep({
          selectedPolicyId: selectedPolicy?.id,
          onClickViewAgents,
          troubleshootLink: link,
          agentCount: enrolledAgentIds.length,
          isLongEnrollment: cloudSecurityIntegration !== undefined,
        })
      );
    }
    if (selectedPolicy) {
      steps.push(
        IncomingDataConfirmationStep({
          agentIds: enrolledAgentIds,
          agentDataConfirmed,
          setAgentDataConfirmed,
          installedPolicy: installedPackagePolicy,
          troubleshootLink: link,
        })
      );
    }

    return steps;
  }, [
    agentPolicy,
    selectedPolicy,
    agentPolicies,
    selectedApiKeyId,
    setSelectedAPIKeyId,
    setSelectedPolicyId,
    refreshAgentPolicies,
    selectionType,
    cloudSecurityIntegration,
    apiKeyData,
    mode,
    setMode,
    enrollToken,
    installManagedCommands,
    isK8s,
    fleetServerHost,
    onClickViewAgents,
    link,
    enrolledAgentIds,
    agentDataConfirmed,
    installedPackagePolicy,
    gcpProjectId,
  ]);

  if (!agentVersion) {
    return <EuiLoadingSpinner />;
  }

  return <EuiSteps steps={instructionsSteps} />;
};

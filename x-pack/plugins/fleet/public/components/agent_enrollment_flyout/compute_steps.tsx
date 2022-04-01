/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect } from 'react';

import { EuiSteps } from '@elastic/eui';
import { safeDump } from 'js-yaml';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { FullAgentPolicy } from '../../../common/types/models/agent_policy';

import { fullAgentPolicyToYaml, agentPolicyRouteService } from '../../services';

import { StandaloneInstructions } from '../enrollment_instructions/standalone';

import {
  useGetOneEnrollmentAPIKey,
  useStartServices,
  useKibanaVersion,
  sendGetOneAgentPolicyFull,
} from '../../hooks';

import {
  deploymentModeStep,
  ServiceTokenStep,
  FleetServerCommandStep,
  useFleetServerInstructions,
  addFleetServerHostStep,
} from '../../applications/fleet/sections/agents/agent_requirements_page/components';

import type { InstructionProps } from './types';
import {
  InstallationModeSelectionStep,
  AgentEnrollmentKeySelectionStep,
  AgentPolicySelectionStep,
  InstallStandaloneAgentStep,
  ConfigureStandaloneAgentStep,
  AgentEnrollmentConfirmationStep,
  InstallManagedAgentStep,
  IncomingDataConfirmationStep,
} from './steps';

import { usePollingAgentCount } from './confirm_agent_enrollment';

import { useIsK8sPolicy, useAgentPolicyWithPackagePolicies } from './hooks';

export const StandaloneSteps: React.FunctionComponent<InstructionProps> = ({
  agentPolicy,
  agentPolicies,
  selectedPolicy,
  setSelectedPolicyId,
  refreshAgentPolicies,
  mode,
  setMode,
  selectionType,
}) => {
  const core = useStartServices();
  const { notifications } = core;
  const [selectedApiKeyId, setSelectedAPIKeyId] = useState<string | undefined>();
  const [fullAgentPolicy, setFullAgentPolicy] = useState<FullAgentPolicy | undefined>();
  const [yaml, setYaml] = useState<any | undefined>('');
  const kibanaVersion = useKibanaVersion();

  const { agentPolicyWithPackagePolicies } = useAgentPolicyWithPackagePolicies(selectedPolicy?.id);
  const { isK8s } = useIsK8sPolicy(
    agentPolicyWithPackagePolicies ? agentPolicyWithPackagePolicies : undefined
  );

  let downloadLink = '';

  if (selectedPolicy?.id) {
    downloadLink =
      isK8s === 'IS_KUBERNETES'
        ? core.http.basePath.prepend(
            `${agentPolicyRouteService.getInfoFullDownloadPath(
              selectedPolicy?.id
            )}?kubernetes=true&standalone=true`
          )
        : core.http.basePath.prepend(
            `${agentPolicyRouteService.getInfoFullDownloadPath(selectedPolicy?.id)}?standalone=true`
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

  const instructionsSteps = useMemo(() => {
    const standaloneInstallCommands = StandaloneInstructions(kibanaVersion, isK8s);

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
      steps.push(InstallationModeSelectionStep({ mode, setMode }));
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
        selectedPolicyId: selectedPolicy?.id,
      })
    );

    return steps;
  }, [
    kibanaVersion,
    isK8s,
    agentPolicy,
    selectedPolicy,
    agentPolicies,
    selectedApiKeyId,
    setSelectedPolicyId,
    refreshAgentPolicies,
    mode,
    selectionType,
    setMode,
    yaml,
    downloadLink,
  ]);

  return <EuiSteps steps={instructionsSteps} />;
};

export const ManagedSteps: React.FunctionComponent<InstructionProps> = ({
  agentPolicy,
  agentPolicies,
  selectedPolicy,
  setSelectedPolicyId,
  isFleetServerPolicySelected,
  settings,
  refreshAgentPolicies,
  mode,
  setMode,
  selectionType,
  onClickViewAgents,
  isK8s,
}) => {
  const core = useStartServices();
  const { docLinks } = core;
  const link = docLinks.links.fleet.troubleshooting;
  const [selectedApiKeyId, setSelectedAPIKeyId] = useState<string | undefined>();

  const [agentEnrolled, setAgentEnrollment] = useState<boolean>(false);
  const [agentDataConfirmed, setAgentDataConfirmed] = useState<boolean>(false);

  const apiKey = useGetOneEnrollmentAPIKey(selectedApiKeyId);
  const apiKeyData = apiKey?.data;
  const fleetServerInstructions = useFleetServerInstructions(apiKeyData?.item?.policy_id);
  const enrolledAgentIds = usePollingAgentCount(selectedPolicy?.id);

  const fleetServerHosts = useMemo(() => {
    return settings?.fleet_server_hosts || [];
  }, [settings]);

  const fleetServerSteps = useMemo(() => {
    const {
      serviceToken,
      getServiceToken,
      isLoadingServiceToken,
      installCommand: managedInstallCommands,
      platform,
      setPlatform,
      deploymentMode,
      setDeploymentMode,
      addFleetServerHost,
    } = fleetServerInstructions;

    return [
      deploymentModeStep({ deploymentMode, setDeploymentMode }),
      addFleetServerHostStep({ addFleetServerHost }),
      ServiceTokenStep({ serviceToken, getServiceToken, isLoadingServiceToken }),
      FleetServerCommandStep({
        serviceToken,
        installCommand: managedInstallCommands,
        platform,
        setPlatform,
      }),
    ];
  }, [fleetServerInstructions]);

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
      steps.push(InstallationModeSelectionStep({ mode, setMode }));
    }

    if (isFleetServerPolicySelected) {
      steps.push(...fleetServerSteps);
    } else {
      steps.push(
        InstallManagedAgentStep({
          apiKeyData,
          selectedApiKeyId,
          fleetServerHosts,
          isK8s,
        })
      );
      if (selectedApiKeyId && apiKeyData) {
        steps.push(
          AgentEnrollmentConfirmationStep({
            selectedPolicyId: selectedPolicy?.id,
            onClickViewAgents,
            troubleshootLink: link,
            agentCount: enrolledAgentIds.length,
            agentEnrolled,
            setAgentEnrollment,
          })
        );
      }
      if (selectedPolicy && agentEnrolled) {
        steps.push(
          IncomingDataConfirmationStep({
            agentsIds: enrolledAgentIds,
            agentDataConfirmed,
            setAgentDataConfirmed,
          })
        );
      }
    }

    return steps;
  }, [
    agentPolicy,
    selectedPolicy,
    agentPolicies,
    selectedApiKeyId,
    setSelectedPolicyId,
    refreshAgentPolicies,
    selectionType,
    isFleetServerPolicySelected,
    mode,
    setMode,
    fleetServerSteps,
    apiKeyData,
    fleetServerHosts,
    isK8s,
    agentEnrolled,
    onClickViewAgents,
    link,
    enrolledAgentIds,
    agentDataConfirmed,
  ]);

  return <EuiSteps steps={instructionsSteps} />;
};

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

import type { FullAgentPolicy } from '../../../../common/types/models/agent_policy';

import { fullAgentPolicyToYaml, agentPolicyRouteService } from '../../../services';

import { StandaloneInstructions, ManualInstructions } from '../../enrollment_instructions';

import {
  useGetOneEnrollmentAPIKey,
  useStartServices,
  useKibanaVersion,
  sendGetOneAgentPolicyFull,
} from '../../../hooks';

import type { InstructionProps } from '../types';
import { usePollingAgentCount } from '../confirm_agent_enrollment';

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
}) => {
  const core = useStartServices();
  const { notifications } = core;
  const [fullAgentPolicy, setFullAgentPolicy] = useState<FullAgentPolicy | undefined>();
  const [yaml, setYaml] = useState<any | undefined>('');
  const kibanaVersion = useKibanaVersion();

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
    const standaloneInstallCommands = StandaloneInstructions(kibanaVersion);

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
    setSelectedAPIKeyId,
    setSelectedPolicyId,
    refreshAgentPolicies,
    selectionType,
    yaml,
    downloadLink,
    mode,
    setMode,
  ]);

  return <EuiSteps steps={instructionsSteps} />;
};

export const ManagedSteps: React.FunctionComponent<InstructionProps> = ({
  agentPolicy,
  agentPolicies,
  selectedPolicy,
  setSelectedPolicyId,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  settings,
  refreshAgentPolicies,
  mode,
  setMode,
  selectionType,
  onClickViewAgents,
  isK8s,
  installedPackagePolicy,
}) => {
  const kibanaVersion = useKibanaVersion();
  const core = useStartServices();
  const { docLinks } = core;
  const link = docLinks.links.fleet.troubleshooting;
  const [agentDataConfirmed, setAgentDataConfirmed] = useState<boolean>(false);

  const apiKey = useGetOneEnrollmentAPIKey(selectedApiKeyId);
  const apiKeyData = apiKey?.data;
  const enrollToken = apiKey.data ? apiKey.data.item.api_key : '';

  const enrolledAgentIds = usePollingAgentCount(selectedPolicy?.id || '');

  const fleetServerHosts = useMemo(() => {
    return settings?.fleet_server_hosts || [];
  }, [settings]);
  const installManagedCommands = ManualInstructions(enrollToken, fleetServerHosts, kibanaVersion);

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

    steps.push(
      InstallManagedAgentStep({
        installCommand: installManagedCommands,
        apiKeyData,
        selectedApiKeyId,
        isK8s,
        enrollToken,
      })
    );
    if (selectedApiKeyId && apiKeyData) {
      steps.push(
        AgentEnrollmentConfirmationStep({
          selectedPolicyId: selectedPolicy?.id,
          onClickViewAgents,
          troubleshootLink: link,
          agentCount: enrolledAgentIds.length,
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
    isK8s,
    installManagedCommands,
    apiKeyData,
    enrolledAgentIds,
    mode,
    setMode,
    enrollToken,
    onClickViewAgents,
    link,
    agentDataConfirmed,
    installedPackagePolicy,
  ]);

  return <EuiSteps steps={instructionsSteps} />;
};

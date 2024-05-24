/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { ExperimentalFeaturesService } from '../../../../../services';
import type {
  AgentPolicy,
  NewAgentPolicy,
  NewPackagePolicy,
  PackageInfo,
} from '../../../../../types';
import { SetupTechnology } from '../../../../../types';
import { sendGetOneAgentPolicy, useStartServices } from '../../../../../hooks';
import { SelectedPolicyTab } from '../../components';
import { AGENTLESS_POLICY_ID } from '../../../../../../../../common/constants';

export const useAgentless = () => {
  const { agentless: agentlessExperimentalFeatureEnabled } = ExperimentalFeaturesService.get();
  const { cloud } = useStartServices();
  const isServerless = !!cloud?.isServerlessEnabled;

  const isAgentlessEnabled = agentlessExperimentalFeatureEnabled && isServerless;

  const isAgentlessAgentPolicy = (agentPolicy: AgentPolicy | undefined) => {
    if (!agentPolicy) return false;
    return (
      isAgentlessEnabled &&
      (agentPolicy?.id === AGENTLESS_POLICY_ID || !!agentPolicy?.supports_agentless)
    );
  };

  // When an integration has at least a policy template enabled for agentless
  const isAgentlessIntegration = (packageInfo: PackageInfo | undefined) => {
    if (
      isAgentlessEnabled &&
      packageInfo?.policy_templates &&
      packageInfo?.policy_templates.length > 0 &&
      !!packageInfo?.policy_templates.find(
        (policyTemplate) => policyTemplate?.deployment_modes?.agentless.enabled === true
      )
    ) {
      return true;
    }
    return false;
  };

  // TODO: remove this check when CSPM implements the above flag and rely only on `isAgentlessIntegration`
  const isAgentlessPackagePolicy = (packagePolicy: NewPackagePolicy) => {
    return isAgentlessEnabled && packagePolicy.policy_id === AGENTLESS_POLICY_ID;
  };
  return {
    isAgentlessEnabled,
    isAgentlessAgentPolicy,
    isAgentlessIntegration,
    isAgentlessPackagePolicy,
  };
};

export function useSetupTechnology({
  updateNewAgentPolicy,
  newAgentPolicy,
  updateAgentPolicy,
  setSelectedPolicyTab,
  packageInfo,
}: {
  updateNewAgentPolicy: (policy: NewAgentPolicy) => void;
  newAgentPolicy: NewAgentPolicy;
  updateAgentPolicy: (policy: AgentPolicy | undefined) => void;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
  packageInfo?: PackageInfo;
}) {
  const { isAgentlessEnabled, isAgentlessIntegration } = useAgentless();
  const [selectedSetupTechnology, setSelectedSetupTechnology] = useState<SetupTechnology>(
    SetupTechnology.AGENT_BASED
  );
  const [agentlessPolicy, setAgentlessPolicy] = useState<AgentPolicy | undefined>();

  useEffect(() => {
    if (isAgentlessEnabled && packageInfo && isAgentlessIntegration(packageInfo)) {
      setSelectedSetupTechnology(SetupTechnology.AGENTLESS);
    }
  }, [isAgentlessEnabled, isAgentlessIntegration, packageInfo]);

  useEffect(() => {
    const fetchAgentlessPolicy = async () => {
      const { data, error } = await sendGetOneAgentPolicy(AGENTLESS_POLICY_ID);
      const isAgentlessAvailable = !error && data && data.item;

      if (isAgentlessAvailable) {
        setAgentlessPolicy(data.item);
      }
    };

    if (isAgentlessEnabled) {
      fetchAgentlessPolicy();
    }
  }, [isAgentlessEnabled]);

  const handleSetupTechnologyChange = useCallback(
    (setupTechnology) => {
      if (!isAgentlessEnabled || setupTechnology === selectedSetupTechnology) {
        return;
      }

      if (setupTechnology === SetupTechnology.AGENTLESS) {
        if (agentlessPolicy) {
          updateAgentPolicy(agentlessPolicy);
          setSelectedPolicyTab(SelectedPolicyTab.EXISTING);
        }
      } else if (setupTechnology === SetupTechnology.AGENT_BASED) {
        updateNewAgentPolicy(newAgentPolicy);
        setSelectedPolicyTab(SelectedPolicyTab.NEW);
        updateAgentPolicy(undefined);
      }
      setSelectedSetupTechnology(setupTechnology);
    },
    [
      isAgentlessEnabled,
      selectedSetupTechnology,
      agentlessPolicy,
      updateAgentPolicy,
      setSelectedPolicyTab,
      updateNewAgentPolicy,
      newAgentPolicy,
    ]
  );

  return {
    handleSetupTechnologyChange,
    agentlessPolicy,
    selectedSetupTechnology,
  };
}

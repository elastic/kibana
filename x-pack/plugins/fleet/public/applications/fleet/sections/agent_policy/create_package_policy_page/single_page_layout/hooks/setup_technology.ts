/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useConfig } from '../../../../../hooks';
import { ExperimentalFeaturesService } from '../../../../../services';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';
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
  const config = useConfig();
  const { agentless: agentlessExperimentalFeatureEnabled } = ExperimentalFeaturesService.get();
  const { cloud } = useStartServices();
  const isServerless = !!cloud?.isServerlessEnabled;
  const isCloud = !!cloud?.isCloudEnabled;
  const agentlessAPI = config.agentless?.api.url;

  const isAgentlessEnabled =
    agentlessExperimentalFeatureEnabled && (isServerless || (isCloud && !!agentlessAPI));

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
    return isAgentlessEnabled && packagePolicy.policy_ids.includes(AGENTLESS_POLICY_ID);
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
  updateAgentPolicies,
  setSelectedPolicyTab,
  packageInfo,
}: {
  updateNewAgentPolicy: (policy: NewAgentPolicy) => void;
  newAgentPolicy: NewAgentPolicy;
  updateAgentPolicies: (policies: AgentPolicy[]) => void;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
  packageInfo?: PackageInfo;
}) {
  const { cloud } = useStartServices();
  const { isAgentlessEnabled, isAgentlessIntegration } = useAgentless();
  // this is a placeholder for the new agentless policy that will be used when the user switches from agentless to agent-based and back
  const [newAgentBasedPolicy] = useState<NewAgentPolicy | undefined>(newAgentPolicy);
  const [selectedSetupTechnology, setSelectedSetupTechnology] = useState<SetupTechnology>(
    SetupTechnology.AGENT_BASED
  );
  const [agentlessPolicy, setAgentlessPolicy] = useState<
    AgentPolicy | NewAgentPolicy | undefined
  >();
  const config = useConfig();
  const agentlessAPI = config.agentless?.api.url;

  useEffect(() => {
    if (isAgentlessEnabled && packageInfo && isAgentlessIntegration(packageInfo)) {
      setSelectedSetupTechnology(SetupTechnology.AGENTLESS);
    }
  }, [isAgentlessEnabled, isAgentlessIntegration, packageInfo]);

  // tech debt: remove this useEffect when Serverless uses the Agentless API and just create a new agentless policy in the handleSetupTechnologyChange
  useEffect(() => {
    const fetchAgentlessPolicy = async () => {
      const { data, error } = await sendGetOneAgentPolicy(AGENTLESS_POLICY_ID);
      const isAgentlessAvailable = !error && data && data.item;

      if (isAgentlessAvailable) {
        setAgentlessPolicy(data.item);
      }
    };

    if (isAgentlessEnabled) {
      if (cloud?.isServerlessEnabled) {
        fetchAgentlessPolicy();
      } else if (cloud?.isCloudEnabled) {
        setAgentlessPolicy(
          generateNewAgentPolicyWithDefaults({
            name: `Agentless policy ${uuidv4()}`,
            supports_agentless: true,
          })
        );
      }
    }
  }, [isAgentlessEnabled, cloud]);

  const handleSetupTechnologyChange = useCallback(
    (setupTechnology: SetupTechnology) => {
      if (!isAgentlessEnabled || setupTechnology === selectedSetupTechnology) {
        return;
      }

      if (setupTechnology === SetupTechnology.AGENTLESS) {
        if (agentlessAPI && cloud?.isCloudEnabled) {
          updateNewAgentPolicy(agentlessPolicy as NewAgentPolicy);
          setSelectedPolicyTab(SelectedPolicyTab.NEW);
          updateAgentPolicies([agentlessPolicy] as AgentPolicy[]);
        }
        // tech debt: remove this when Serverless uses the Agentless API
        if (cloud?.isServerlessEnabled) {
          updateNewAgentPolicy(agentlessPolicy as AgentPolicy);
          updateAgentPolicies([agentlessPolicy] as AgentPolicy[]);
          setSelectedPolicyTab(SelectedPolicyTab.EXISTING);
        }
      } else if (setupTechnology === SetupTechnology.AGENT_BASED) {
        updateNewAgentPolicy(newAgentBasedPolicy as NewAgentPolicy);
        setSelectedPolicyTab(SelectedPolicyTab.NEW);
        updateAgentPolicies([]);
      }
      setSelectedSetupTechnology(setupTechnology);
    },
    [
      isAgentlessEnabled,
      selectedSetupTechnology,
      agentlessAPI,
      cloud?.isCloudEnabled,
      cloud?.isServerlessEnabled,
      updateNewAgentPolicy,
      agentlessPolicy,
      setSelectedPolicyTab,
      updateAgentPolicies,
      newAgentBasedPolicy,
    ]
  );

  return {
    handleSetupTechnologyChange,
    isAgentlessEnabled,
    selectedSetupTechnology,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

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
import { getAgentlessAgentPolicyNameFromPackagePolicyName } from '../../../../../../../../common/services/agentless_policy_helper';

export const useAgentless = () => {
  const config = useConfig();
  const { agentless: agentlessExperimentalFeatureEnabled } = ExperimentalFeaturesService.get();
  const { cloud } = useStartServices();
  const isServerless = !!cloud?.isServerlessEnabled;
  const isCloud = !!cloud?.isCloudEnabled;
  const agentlessAPIUrl = config.agentless?.api.url;

  const isAgentlessEnabled =
    agentlessExperimentalFeatureEnabled && (isServerless || (isCloud && !!agentlessAPIUrl));

  const isAgentlessCloudEnabled = isCloud && isAgentlessEnabled && !!agentlessAPIUrl;
  const isAgentlessServerlessEnabled = isServerless && isAgentlessEnabled;

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
    agentlessAPIUrl,
    isAgentlessCloudEnabled,
    isAgentlessServerlessEnabled,
    isAgentlessEnabled,
    isAgentlessAgentPolicy,
    isAgentlessIntegration,
    isAgentlessPackagePolicy,
  };
};

export function useSetupTechnology({
  setNewAgentPolicy,
  newAgentPolicy,
  updateAgentPolicies,
  setSelectedPolicyTab,
  packageInfo,
  packagePolicy,
  isEditPage,
}: {
  setNewAgentPolicy: (policy: NewAgentPolicy) => void;
  newAgentPolicy: NewAgentPolicy;
  updateAgentPolicies: (policies: AgentPolicy[]) => void;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
  packageInfo?: PackageInfo;
  packagePolicy: NewPackagePolicy;
  isEditPage?: boolean;
}) {
  const { cloud } = useStartServices();
  const { isAgentlessEnabled, isAgentlessCloudEnabled, isAgentlessServerlessEnabled } =
    useAgentless();

  // this is a placeholder for the new agent-BASED policy that will be used when the user switches from agentless to agent-based and back
  const newAgentBasedPolicy = useRef<NewAgentPolicy>(newAgentPolicy);
  const [selectedSetupTechnology, setSelectedSetupTechnology] = useState<SetupTechnology>(
    SetupTechnology.AGENT_BASED
  );
  const [newAgentlessPolicy, setNewAgentlessPolicy] = useState<AgentPolicy | NewAgentPolicy>(
    generateNewAgentPolicyWithDefaults({
      supports_agentless: true,
      monitoring_enabled: [],
    })
  );

  useEffect(() => {
    if (isEditPage) {
      return;
    }
    if (isAgentlessCloudEnabled && selectedSetupTechnology === SetupTechnology.AGENTLESS) {
      const nextNewAgentlessPolicy = {
        ...newAgentlessPolicy,
        name: getAgentlessAgentPolicyNameFromPackagePolicyName(packagePolicy.name),
      };
      if (nextNewAgentlessPolicy.name !== newAgentlessPolicy.name) {
        setNewAgentlessPolicy(nextNewAgentlessPolicy);
        setNewAgentPolicy(nextNewAgentlessPolicy as NewAgentPolicy);
        updateAgentPolicies([nextNewAgentlessPolicy] as AgentPolicy[]);
      }
    }
  }, [
    isAgentlessCloudEnabled,
    isEditPage,
    newAgentlessPolicy,
    packagePolicy.name,
    selectedSetupTechnology,
    updateAgentPolicies,
    setNewAgentPolicy,
  ]);

  // tech debt: remove this useEffect when Serverless uses the Agentless API
  // https://github.com/elastic/security-team/issues/9781
  useEffect(() => {
    const fetchAgentlessPolicy = async () => {
      const { data, error } = await sendGetOneAgentPolicy(AGENTLESS_POLICY_ID);
      const isAgentlessAvailable = !error && data && data.item;

      if (isAgentlessAvailable) {
        setNewAgentlessPolicy(data.item);
      }
    };

    if (isAgentlessEnabled) {
      if (cloud?.isServerlessEnabled) {
        fetchAgentlessPolicy();
      }
    }
  }, [isAgentlessEnabled, cloud]);

  const handleSetupTechnologyChange = useCallback(
    (setupTechnology: SetupTechnology) => {
      if (!isAgentlessEnabled || setupTechnology === selectedSetupTechnology) {
        return;
      }

      if (setupTechnology === SetupTechnology.AGENTLESS) {
        if (isAgentlessCloudEnabled) {
          setNewAgentPolicy(newAgentlessPolicy as NewAgentPolicy);
          setSelectedPolicyTab(SelectedPolicyTab.NEW);
          updateAgentPolicies([newAgentlessPolicy] as AgentPolicy[]);
        }
        // tech debt: remove this when Serverless uses the Agentless API
        // https://github.com/elastic/security-team/issues/9781
        if (isAgentlessServerlessEnabled) {
          setNewAgentPolicy(newAgentlessPolicy as AgentPolicy);
          updateAgentPolicies([newAgentlessPolicy] as AgentPolicy[]);
          setSelectedPolicyTab(SelectedPolicyTab.EXISTING);
        }
      } else if (setupTechnology === SetupTechnology.AGENT_BASED) {
        setNewAgentPolicy({
          ...newAgentBasedPolicy.current,
          supports_agentless: false,
          is_managed: false,
        });
        setSelectedPolicyTab(SelectedPolicyTab.NEW);
        updateAgentPolicies([newAgentBasedPolicy.current] as AgentPolicy[]);
      }
      setSelectedSetupTechnology(setupTechnology);
    },
    [
      isAgentlessEnabled,
      selectedSetupTechnology,
      isAgentlessCloudEnabled,
      isAgentlessServerlessEnabled,
      setNewAgentPolicy,
      newAgentlessPolicy,
      setSelectedPolicyTab,
      updateAgentPolicies,
    ]
  );

  return {
    handleSetupTechnologyChange,
    selectedSetupTechnology,
  };
}

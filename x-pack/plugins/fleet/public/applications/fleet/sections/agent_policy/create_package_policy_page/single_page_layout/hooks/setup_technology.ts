/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import {
  AGENTLESS_POLICY_ID,
  AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
  AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
  AGENTLESS_GLOBAL_TAG_NAME_TEAM,
} from '../../../../../../../../common/constants';
import {
  isAgentlessIntegration as isAgentlessIntegrationFn,
  getAgentlessAgentPolicyNameFromPackagePolicyName,
  isOnlyAgentlessIntegration,
} from '../../../../../../../../common/services/agentless_policy_helper';

export const useAgentless = () => {
  const config = useConfig();
  const { agentless: agentlessExperimentalFeatureEnabled } = ExperimentalFeaturesService.get();
  const { cloud } = useStartServices();
  const isServerless = !!cloud?.isServerlessEnabled;
  const isCloud = !!cloud?.isCloudEnabled;

  const isAgentlessApiEnabled = (isCloud || isServerless) && config.agentless?.enabled;
  const isDefaultAgentlessPolicyEnabled =
    !isAgentlessApiEnabled && isServerless && agentlessExperimentalFeatureEnabled;

  const isAgentlessEnabled = isAgentlessApiEnabled || isDefaultAgentlessPolicyEnabled;

  const isAgentlessAgentPolicy = (agentPolicy: AgentPolicy | undefined) => {
    if (!agentPolicy) return false;
    return (
      isAgentlessEnabled &&
      (agentPolicy?.id === AGENTLESS_POLICY_ID || !!agentPolicy?.supports_agentless)
    );
  };

  // When an integration has at least a policy template enabled for agentless
  const isAgentlessIntegration = (packageInfo: PackageInfo | undefined) => {
    if (isAgentlessEnabled && isAgentlessIntegrationFn(packageInfo)) {
      return true;
    }
    return false;
  };

  // TODO: remove this check when CSPM implements the above flag and rely only on `isAgentlessIntegration`
  const isAgentlessPackagePolicy = (packagePolicy: NewPackagePolicy) => {
    return isAgentlessEnabled && packagePolicy.policy_ids.includes(AGENTLESS_POLICY_ID);
  };
  return {
    isAgentlessApiEnabled,
    isDefaultAgentlessPolicyEnabled,
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
  agentPolicies,
}: {
  setNewAgentPolicy: (policy: NewAgentPolicy) => void;
  newAgentPolicy: NewAgentPolicy;
  updateAgentPolicies: (policies: AgentPolicy[]) => void;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
  packageInfo?: PackageInfo;
  packagePolicy: NewPackagePolicy;
  isEditPage?: boolean;
  agentPolicies?: AgentPolicy[];
}) {
  const { isAgentlessEnabled, isAgentlessApiEnabled, isDefaultAgentlessPolicyEnabled } =
    useAgentless();

  // this is a placeholder for the new agent-BASED policy that will be used when the user switches from agentless to agent-based and back
  const newAgentBasedPolicy = useRef<NewAgentPolicy>(newAgentPolicy);
  const defaultSetupTechnology = useMemo(() => {
    return isOnlyAgentlessIntegration(packageInfo)
      ? SetupTechnology.AGENTLESS
      : SetupTechnology.AGENT_BASED;
  }, [packageInfo]);
  const [selectedSetupTechnology, setSelectedSetupTechnology] =
    useState<SetupTechnology>(defaultSetupTechnology);
  const [newAgentlessPolicy, setNewAgentlessPolicy] = useState<AgentPolicy | NewAgentPolicy>(() => {
    const agentless = generateNewAgentPolicyWithDefaults({
      inactivity_timeout: 3600,
      supports_agentless: true,
      monitoring_enabled: ['logs', 'metrics'],
    });
    return agentless;
  });

  useEffect(() => {
    if (isEditPage && agentPolicies && agentPolicies.some((policy) => policy.supports_agentless)) {
      setSelectedSetupTechnology(SetupTechnology.AGENTLESS);
      return;
    }
    if (isAgentlessApiEnabled && selectedSetupTechnology === SetupTechnology.AGENTLESS) {
      const nextNewAgentlessPolicy = {
        ...newAgentlessPolicy,
        name: getAgentlessAgentPolicyNameFromPackagePolicyName(packagePolicy.name),
      };
      if (!newAgentlessPolicy.name || nextNewAgentlessPolicy.name !== newAgentlessPolicy.name) {
        setNewAgentlessPolicy(nextNewAgentlessPolicy);
        setNewAgentPolicy(nextNewAgentlessPolicy as NewAgentPolicy);
        updateAgentPolicies([nextNewAgentlessPolicy] as AgentPolicy[]);
      }
    }
  }, [
    isAgentlessApiEnabled,
    isEditPage,
    newAgentlessPolicy,
    packagePolicy.name,
    selectedSetupTechnology,
    updateAgentPolicies,
    setNewAgentPolicy,
    agentPolicies,
    setSelectedSetupTechnology,
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

    if (isDefaultAgentlessPolicyEnabled) {
      fetchAgentlessPolicy();
    }
  }, [isDefaultAgentlessPolicyEnabled]);

  useEffect(() => {
    if (isEditPage) {
      return;
    }
    setSelectedSetupTechnology(defaultSetupTechnology);
  }, [packageInfo, defaultSetupTechnology, isEditPage]);

  const handleSetupTechnologyChange = useCallback(
    (setupTechnology: SetupTechnology, policyTemplateName?: string) => {
      if (!isAgentlessEnabled || setupTechnology === selectedSetupTechnology) {
        return;
      }

      if (setupTechnology === SetupTechnology.AGENTLESS) {
        if (isAgentlessApiEnabled) {
          const agentlessPolicy = {
            ...newAgentlessPolicy,
            ...getAdditionalAgentlessPolicyInfo(policyTemplateName, packageInfo),
          } as NewAgentPolicy;

          setNewAgentPolicy(agentlessPolicy);
          setNewAgentlessPolicy(agentlessPolicy);
          setSelectedPolicyTab(SelectedPolicyTab.NEW);
          updateAgentPolicies([agentlessPolicy] as AgentPolicy[]);
        }
        // tech debt: remove this when Serverless uses the Agentless API
        // https://github.com/elastic/security-team/issues/9781
        if (isDefaultAgentlessPolicyEnabled) {
          setNewAgentPolicy(newAgentlessPolicy as AgentPolicy);
          updateAgentPolicies([newAgentlessPolicy] as AgentPolicy[]);
          setSelectedPolicyTab(SelectedPolicyTab.EXISTING);
        }
      } else if (setupTechnology === SetupTechnology.AGENT_BASED) {
        setNewAgentPolicy({
          ...newAgentBasedPolicy.current,
          supports_agentless: false,
        });
        setSelectedPolicyTab(SelectedPolicyTab.NEW);
        updateAgentPolicies([newAgentBasedPolicy.current] as AgentPolicy[]);
      }
      setSelectedSetupTechnology(setupTechnology);
    },
    [
      isAgentlessEnabled,
      selectedSetupTechnology,
      isAgentlessApiEnabled,
      isDefaultAgentlessPolicyEnabled,
      setNewAgentPolicy,
      newAgentlessPolicy,
      setSelectedPolicyTab,
      updateAgentPolicies,
      packageInfo,
    ]
  );

  return {
    handleSetupTechnologyChange,
    selectedSetupTechnology,
  };
}

const getAdditionalAgentlessPolicyInfo = (
  policyTemplateName?: string,
  packageInfo?: PackageInfo
) => {
  if (!policyTemplateName || !packageInfo) {
    return {};
  }
  const agentlessPolicyTemplate = policyTemplateName
    ? packageInfo?.policy_templates?.find((policy) => policy.name === policyTemplateName)
    : undefined;

  const agentlessInfo = agentlessPolicyTemplate?.deployment_modes?.agentless;
  return !agentlessInfo
    ? {}
    : {
        global_data_tags: agentlessInfo
          ? [
              {
                name: AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
                value: agentlessInfo.organization,
              },
              {
                name: AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
                value: agentlessInfo.division,
              },
              {
                name: AGENTLESS_GLOBAL_TAG_NAME_TEAM,
                value: agentlessInfo.team,
              },
            ]
          : [],
      };
};

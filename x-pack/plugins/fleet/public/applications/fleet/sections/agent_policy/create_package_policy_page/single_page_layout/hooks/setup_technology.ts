/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import { useConfig } from '../../../../../hooks';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';
import type {
  AgentPolicy,
  NewAgentPolicy,
  NewPackagePolicy,
  PackageInfo,
} from '../../../../../types';
import { SetupTechnology } from '../../../../../types';
import { useStartServices } from '../../../../../hooks';
import { SelectedPolicyTab } from '../../components';
import {
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
  const { cloud } = useStartServices();
  const isServerless = !!cloud?.isServerlessEnabled;
  const isCloud = !!cloud?.isCloudEnabled;

  const isAgentlessEnabled = (isCloud || isServerless) && config.agentless?.enabled === true;

  const isAgentlessAgentPolicy = (agentPolicy: AgentPolicy | undefined) => {
    if (!agentPolicy) return false;
    return isAgentlessEnabled && !!agentPolicy?.supports_agentless;
  };

  // When an integration has at least a policy template enabled for agentless
  const isAgentlessIntegration = (packageInfo: PackageInfo | undefined) => {
    if (isAgentlessEnabled && isAgentlessIntegrationFn(packageInfo)) {
      return true;
    }
    return false;
  };

  return {
    isAgentlessEnabled,
    isAgentlessAgentPolicy,
    isAgentlessIntegration,
  };
};

export function useSetupTechnology({
  setNewAgentPolicy,
  newAgentPolicy,
  updateAgentPolicies,
  updatePackagePolicy,
  setSelectedPolicyTab,
  packageInfo,
  packagePolicy,
  isEditPage,
  agentPolicies,
}: {
  setNewAgentPolicy: (policy: NewAgentPolicy) => void;
  newAgentPolicy: NewAgentPolicy;
  updateAgentPolicies: (policies: AgentPolicy[]) => void;
  updatePackagePolicy: (policy: Partial<NewPackagePolicy>) => void;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
  packageInfo?: PackageInfo;
  packagePolicy: NewPackagePolicy;
  isEditPage?: boolean;
  agentPolicies?: AgentPolicy[];
}) {
  const { isAgentlessEnabled } = useAgentless();

  // this is a placeholder for the new agent-BASED policy that will be used when the user switches from agentless to agent-based and back
  const orginalAgentPolicyRef = useRef<NewAgentPolicy>(newAgentPolicy);
  const defaultSetupTechnology = useMemo(() => {
    return isOnlyAgentlessIntegration(packageInfo)
      ? SetupTechnology.AGENTLESS
      : SetupTechnology.AGENT_BASED;
  }, [packageInfo]);
  // const updatedPackagePolicy = useRef<NewPackagePolicy>(packagePolicy);
  const [agentlessPolicyTemplateName, setAgentlessPolicyTemplateName] = useState<
    string | undefined
  >();
  const [selectedSetupTechnology, setSelectedSetupTechnology] =
    useState<SetupTechnology>(defaultSetupTechnology);
  // const [newAgentlessPolicy, setNewAgentlessPolicy] = useState<AgentPolicy | NewAgentPolicy>(() => {
  //   const agentless = generateNewAgentPolicyWithDefaults({
  //     inactivity_timeout: 3600,
  //     supports_agentless: true,
  //     monitoring_enabled: ['logs', 'metrics'],
  //   });
  //   return agentless;
  // });

  // useEffect(() => {
  if (
    isEditPage &&
    selectedSetupTechnology !== SetupTechnology.AGENTLESS &&
    agentPolicies &&
    agentPolicies.some((policy) => policy.supports_agentless)
  ) {
    setSelectedSetupTechnology(SetupTechnology.AGENTLESS);
  }

  if (
    !isEditPage &&
    isAgentlessEnabled &&
    selectedSetupTechnology === SetupTechnology.AGENTLESS &&
    getAgentlessAgentPolicyNameFromPackagePolicyName(packagePolicy.name) !== newAgentPolicy.name
  ) {
    const nextNewAgentlessPolicy = {
      ...generateNewAgentPolicyWithDefaults({
        inactivity_timeout: 3600,
        supports_agentless: true,
        monitoring_enabled: ['logs', 'metrics'],
      }),
      ...getAdditionalAgentlessPolicyInfo(agentlessPolicyTemplateName, packageInfo),
      name: getAgentlessAgentPolicyNameFromPackagePolicyName(packagePolicy.name),
    };
    // setNewAgentlessPolicy(nextNewAgentlessPolicy);
    setNewAgentPolicy(nextNewAgentlessPolicy as NewAgentPolicy);
    updateAgentPolicies([nextNewAgentlessPolicy] as AgentPolicy[]);
    updatePackagePolicy({
      supports_agentless: true,
    });
  }
  // if (
  //   selectedSetupTechnology === SetupTechnology.AGENTLESS &&
  //   !packagePolicy.supports_agentless
  // ) {
  //   updatePackagePolicy({
  //     supports_agentless: true,
  //   });
  // } else
  if (
    !isEditPage &&
    selectedSetupTechnology !== SetupTechnology.AGENTLESS &&
    (newAgentPolicy.supports_agentless || packagePolicy.supports_agentless)
  ) {
    const nextNewAgentlessPolicy = {
      ...orginalAgentPolicyRef.current,
      supports_agentless: false,
    };

    setNewAgentPolicy(nextNewAgentlessPolicy);
    updateAgentPolicies([nextNewAgentlessPolicy] as AgentPolicy[]);
    updatePackagePolicy({
      supports_agentless: false,
    });
  }
  // }, [
  //   isAgentlessEnabled,
  //   isEditPage,
  //   // newAgentlessPolicy,
  //   newAgentPolicy,
  //   packagePolicy.name,
  //   packagePolicy.supports_agentless,
  //   selectedSetupTechnology,
  //   updateAgentPolicies,
  //   setNewAgentPolicy,
  //   agentPolicies,
  //   setSelectedSetupTechnology,
  //   updatePackagePolicy,
  //   packageInfo,
  //   agentlessPolicyTemplateName,
  // ]);

  const handleSetupTechnologyChange = useCallback(
    (setupTechnology: SetupTechnology, policyTemplateName?: string) => {
      if (!isAgentlessEnabled || setupTechnology === selectedSetupTechnology) {
        return;
      }

      if (setupTechnology === SetupTechnology.AGENTLESS) {
        if (isAgentlessEnabled) {
          setAgentlessPolicyTemplateName(policyTemplateName);
          // const agentlessPolicy = {
          //   ...newAgentlessPolicy,
          //   ...getAdditionalAgentlessPolicyInfo(policyTemplateName, packageInfo),
          // } as NewAgentPolicy;

          // setNewAgentPolicy(agentlessPolicy);
          // setNewAgentlessPolicy(agentlessPolicy);
          setSelectedPolicyTab(SelectedPolicyTab.NEW);
          // updateAgentPolicies([agentlessPolicy] as AgentPolicy[]);
        }
        // updatePackagePolicy({
        //   supports_agentless: true,
        // });
      } else if (setupTechnology === SetupTechnology.AGENT_BASED) {
        // setNewAgentPolicy({
        //   ...orginalAgentPolicyRef.current,
        //   supports_agentless: false,
        // });
        // updatePackagePolicy({
        //   supports_agentless: false,
        // });
        setSelectedPolicyTab(SelectedPolicyTab.NEW);
        // updateAgentPolicies([orginalAgentPolicyRef.current] as AgentPolicy[]);
      }
      setSelectedSetupTechnology(setupTechnology);
    },
    [
      isAgentlessEnabled,
      selectedSetupTechnology,
      // updatePackagePolicy,
      // setNewAgentPolicy,
      // newAgentlessPolicy,
      // packageInfo,
      setSelectedPolicyTab,
      // updateAgentPolicies,
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

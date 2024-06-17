/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui';

import type { AgentPolicy, NewAgentPolicy, NewPackagePolicy } from '../../../../../../../common';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../common/services';
import { SelectedPolicyTab, StepSelectHosts } from '../../create_package_policy_page/components';
import type { PackageInfo } from '../../../../types';
import { SetupTechnology } from '../../../../types';
import {
  useDevToolsRequest,
  useSetupTechnology,
} from '../../create_package_policy_page/single_page_layout/hooks';
import { agentPolicyFormValidation } from '../../components';
import { createAgentPolicyIfNeeded } from '../../create_package_policy_page/single_page_layout/hooks/form';

interface Params {
  configureStep: React.ReactNode;
  packageInfo?: PackageInfo;
  existingAgentPolicies: AgentPolicy[];
  setHasAgentPolicyError: (hasError: boolean) => void;
  updatePackagePolicy: (data: { policy_ids: string[] }) => void;
  agentPolicies: AgentPolicy[];
  setAgentPolicies: (agentPolicies: AgentPolicy[]) => void;
  isLoadingData: boolean;
  packagePolicy: NewPackagePolicy;
  packagePolicyId: string;
  setNewAgentPolicyName: (newAgentPolicyName: string | undefined) => void;
}

export function usePackagePolicySteps({
  configureStep,
  packageInfo,
  existingAgentPolicies,
  setHasAgentPolicyError,
  updatePackagePolicy,
  agentPolicies,
  setAgentPolicies,
  isLoadingData,
  packagePolicy,
  packagePolicyId,
  setNewAgentPolicyName,
}: Params) {
  const [newAgentPolicy, setNewAgentPolicy] = useState<NewAgentPolicy>(
    generateNewAgentPolicyWithDefaults({ name: 'Agent policy 1' })
  );
  const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);

  const [selectedPolicyTab, setSelectedPolicyTab] = useState<SelectedPolicyTab>(
    SelectedPolicyTab.EXISTING
  );
  const validation = agentPolicyFormValidation(newAgentPolicy);

  const setPolicyValidation = useCallback(
    (currentTab: SelectedPolicyTab, updatedAgentPolicy: NewAgentPolicy) => {
      if (currentTab === SelectedPolicyTab.NEW) {
        if (
          !updatedAgentPolicy.name ||
          updatedAgentPolicy.name.trim() === '' ||
          !updatedAgentPolicy.namespace ||
          updatedAgentPolicy.namespace.trim() === ''
        ) {
          setHasAgentPolicyError(true);
        } else {
          setHasAgentPolicyError(false);
        }
      }
    },
    [setHasAgentPolicyError]
  );

  const updateSelectedPolicyTab = useCallback(
    (currentTab) => {
      setSelectedPolicyTab(currentTab);
      setPolicyValidation(currentTab, newAgentPolicy);
    },
    [setSelectedPolicyTab, setPolicyValidation, newAgentPolicy]
  );

  // Update agent policy method
  const updateAgentPolicies = useCallback(
    (updatedAgentPolicies: AgentPolicy[]) => {
      if (!isLoadingData && isEqual(updatedAgentPolicies, agentPolicies)) {
        return;
      }
      if (updatedAgentPolicies.length > 0) {
        setAgentPolicies(updatedAgentPolicies);
        updatePackagePolicy({
          policy_ids: updatedAgentPolicies.map((policy) => policy.id),
        });
        if (packageInfo) {
          setHasAgentPolicyError(false);
        }
      } else {
        setHasAgentPolicyError(true);
        setAgentPolicies([]);
        updatePackagePolicy({
          policy_ids: [],
        });
      }

      // eslint-disable-next-line no-console
      console.debug('Agent policy updated', updatedAgentPolicies);
    },
    [
      packageInfo,
      agentPolicies,
      isLoadingData,
      updatePackagePolicy,
      setHasAgentPolicyError,
      setAgentPolicies,
    ]
  );

  const updateNewAgentPolicy = useCallback(
    (updatedFields: Partial<NewAgentPolicy>) => {
      const updatedAgentPolicy = {
        ...newAgentPolicy,
        ...updatedFields,
      };
      setNewAgentPolicy(updatedAgentPolicy);
      setPolicyValidation(selectedPolicyTab, updatedAgentPolicy);
    },
    [setNewAgentPolicy, setPolicyValidation, newAgentPolicy, selectedPolicyTab]
  );

  const { selectedSetupTechnology } = useSetupTechnology({
    newAgentPolicy,
    updateNewAgentPolicy,
    updateAgentPolicies,
    setSelectedPolicyTab,
    packageInfo,
  });

  const stepSelectAgentPolicy = useMemo(
    () => (
      <StepSelectHosts
        agentPolicies={agentPolicies}
        updateAgentPolicies={updateAgentPolicies}
        newAgentPolicy={newAgentPolicy}
        updateNewAgentPolicy={updateNewAgentPolicy}
        withSysMonitoring={withSysMonitoring}
        updateSysMonitoring={(newValue) => setWithSysMonitoring(newValue)}
        validation={validation}
        packageInfo={packageInfo}
        setHasAgentPolicyError={setHasAgentPolicyError}
        updateSelectedTab={updateSelectedPolicyTab}
        selectedAgentPolicyIds={existingAgentPolicies.map((policy) => policy.id)}
        initialSelectedTabIndex={1}
      />
    ),
    [
      packageInfo,
      agentPolicies,
      updateAgentPolicies,
      newAgentPolicy,
      updateNewAgentPolicy,
      validation,
      withSysMonitoring,
      updateSelectedPolicyTab,
      setHasAgentPolicyError,
      existingAgentPolicies,
      setWithSysMonitoring,
    ]
  );

  const steps: EuiStepProps[] = [
    {
      title: i18n.translate('xpack.fleet.createPackagePolicy.stepConfigurePackagePolicyTitle', {
        defaultMessage: 'Configure integration',
      }),
      'data-test-subj': 'dataCollectionSetupStep',
      children: configureStep,
      headingElement: 'h2',
    },
  ];

  if (selectedSetupTechnology !== SetupTechnology.AGENTLESS) {
    steps.push({
      title: i18n.translate('xpack.fleet.createPackagePolicy.stepSelectAgentPolicyTitle', {
        defaultMessage: 'Where to add this integration?',
      }),
      children: stepSelectAgentPolicy,
      headingElement: 'h2',
    });
  }

  const devToolsProps = useDevToolsRequest({
    newAgentPolicy,
    packagePolicy,
    selectedPolicyTab,
    withSysMonitoring,
    packageInfo,
    packagePolicyId,
  });

  useEffect(() => {
    setNewAgentPolicyName(
      selectedPolicyTab === SelectedPolicyTab.NEW ? newAgentPolicy.name : undefined
    );
  }, [newAgentPolicy, selectedPolicyTab, setNewAgentPolicyName]);

  return {
    steps,
    devToolsProps,
    createAgentPolicyIfNeeded: async () => {
      const createdAgentPolicy = await createAgentPolicyIfNeeded({
        newAgentPolicy,
        packagePolicy,
        withSysMonitoring,
        packageInfo,
        selectedPolicyTab,
      });
      return createdAgentPolicy?.id;
    },
  };
}

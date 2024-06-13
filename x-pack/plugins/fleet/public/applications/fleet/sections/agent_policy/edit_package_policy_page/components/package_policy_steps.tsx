/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui';

import type { AgentPolicy, NewAgentPolicy } from '../../../../../../../common';

import { SelectedPolicyTab, StepSelectHosts } from '../../create_package_policy_page/components';
import { StepsWithLessPadding } from '../../create_package_policy_page/single_page_layout';
import type { PackageInfo } from '../../../../types';
import { SetupTechnology } from '../../../../types';
import { useSetupTechnology } from '../../create_package_policy_page/single_page_layout/hooks';
import { agentPolicyFormValidation } from '../../components';

interface Props {
  configureStep: React.ReactNode;
  packageInfo?: PackageInfo;
  existingAgentPolicies: AgentPolicy[];
  newAgentPolicy: NewAgentPolicy;
  setNewAgentPolicy: (newAgentPolicy: NewAgentPolicy) => void;
  setHasAgentPolicyError: (hasError: boolean) => void;
  updatePackagePolicy: (data: { policy_ids: string[] }) => void;
  agentPolicies: AgentPolicy[];
  setAgentPolicies: (agentPolicies: AgentPolicy[]) => void;
  isLoadingData: boolean;
  withSysMonitoring: boolean;
  setWithSysMonitoring: (value: boolean) => void;
  selectedPolicyTab: SelectedPolicyTab;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
}

export const PackagePolicySteps: React.FC<Props> = ({
  configureStep,
  packageInfo,
  existingAgentPolicies,
  newAgentPolicy,
  setNewAgentPolicy,
  setHasAgentPolicyError,
  updatePackagePolicy,
  agentPolicies,
  setAgentPolicies,
  isLoadingData,
  withSysMonitoring,
  setWithSysMonitoring,
  selectedPolicyTab,
  setSelectedPolicyTab,
}) => {
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

  return <StepsWithLessPadding steps={steps} />;
};

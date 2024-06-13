/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui';

import { generateNewAgentPolicyWithDefaults } from '../../../../../../../common/services';

import type { AgentPolicy, NewAgentPolicy, NewPackagePolicy } from '../../../../../../../common';
import { FLEET_ELASTIC_AGENT_PACKAGE, FLEET_SYSTEM_PACKAGE } from '../../../../../../../common';

import { SelectedPolicyTab, StepSelectHosts } from '../../create_package_policy_page/components';
import type { PackageInfo } from '../../../../types';
import { SetupTechnology } from '../../../../types';
import {
  useDevToolsRequest,
  useSetupTechnology,
} from '../../create_package_policy_page/single_page_layout/hooks';
import { agentPolicyFormValidation } from '../../components';
import { sendBulkInstallPackages } from '../../../../hooks';
import { createAgentPolicy } from '../../create_package_policy_page/single_page_layout/hooks/form';

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

  const createAgentPolicyIfNeeded = async (): Promise<string | undefined> => {
    if (selectedPolicyTab === SelectedPolicyTab.NEW) {
      if ((withSysMonitoring || newAgentPolicy.monitoring_enabled?.length) ?? 0 > 0) {
        const packagesToPreinstall: Array<string | { name: string; version: string }> = [];
        // skip preinstall of input package, to be able to rollback when package policy creation fails
        if (packageInfo && packageInfo.type !== 'input') {
          packagesToPreinstall.push({ name: packageInfo.name, version: packageInfo.version });
        }
        if (withSysMonitoring) {
          packagesToPreinstall.push(FLEET_SYSTEM_PACKAGE);
        }
        if (newAgentPolicy.monitoring_enabled?.length ?? 0 > 0) {
          packagesToPreinstall.push(FLEET_ELASTIC_AGENT_PACKAGE);
        }

        if (packagesToPreinstall.length > 0) {
          await sendBulkInstallPackages([...new Set(packagesToPreinstall)]);
        }
      }
      const createdPolicy = await createAgentPolicy({
        newAgentPolicy,
        packagePolicy,
        withSysMonitoring,
      });
      return createdPolicy.id;
    }
  };

  return {
    steps,
    devToolsProps,
    createAgentPolicyIfNeeded,
  };
}

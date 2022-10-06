/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { safeLoad } from 'js-yaml';

import type {
  AgentPolicy,
  NewPackagePolicy,
  NewAgentPolicy,
  CreatePackagePolicyRequest,
  PackagePolicy,
  PackageInfo,
} from '../../../../../types';
import {
  useStartServices,
  sendCreateAgentPolicy,
  sendCreatePackagePolicy,
  sendBulkInstallPackages,
} from '../../../../../hooks';
import { isVerificationError } from '../../../../../services';
import { FLEET_ELASTIC_AGENT_PACKAGE, FLEET_SYSTEM_PACKAGE } from '../../../../../../../../common';
import { useConfirmForceInstall } from '../../../../../../integrations/hooks';
import { validatePackagePolicy, validationHasErrors } from '../../services';
import type { PackagePolicyValidationResults } from '../../services';
import type { PackagePolicyFormState } from '../../types';
import { SelectedPolicyTab } from '../../components';
import { useOnSaveNavigate } from '../../hooks';

async function createAgentPolicy({
  packagePolicy,
  newAgentPolicy,
  withSysMonitoring,
}: {
  packagePolicy: NewPackagePolicy;
  newAgentPolicy: NewAgentPolicy;
  withSysMonitoring: boolean;
}): Promise<AgentPolicy> {
  // do not create agent policy with system integration if package policy already is for system package
  const packagePolicyIsSystem = packagePolicy?.package?.name === FLEET_SYSTEM_PACKAGE;
  const resp = await sendCreateAgentPolicy(newAgentPolicy, {
    withSysMonitoring: withSysMonitoring && !packagePolicyIsSystem,
  });
  if (resp.error) {
    throw resp.error;
  }
  if (!resp.data) {
    throw new Error('Invalid agent policy creation no data');
  }
  return resp.data.item;
}

async function savePackagePolicy(pkgPolicy: CreatePackagePolicyRequest['body']) {
  const result = await sendCreatePackagePolicy(pkgPolicy);

  return result;
}

export function useOnSubmit({
  agentCount,
  selectedPolicyTab,
  newAgentPolicy,
  withSysMonitoring,
  queryParamsPolicyId,
  packageInfo,
}: {
  packageInfo?: PackageInfo;
  newAgentPolicy: NewAgentPolicy;
  withSysMonitoring: boolean;
  selectedPolicyTab: SelectedPolicyTab;
  agentCount: number;
  queryParamsPolicyId: string | undefined;
}) {
  const { notifications } = useStartServices();
  const confirmForceInstall = useConfirmForceInstall();
  // only used to store the resulting package policy once saved
  const [savedPackagePolicy, setSavedPackagePolicy] = useState<PackagePolicy>();
  // Form state
  const [formState, setFormState] = useState<PackagePolicyFormState>('VALID');

  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy | undefined>();
  // New package policy state
  const [packagePolicy, setPackagePolicy] = useState<NewPackagePolicy>({
    name: '',
    description: '',
    namespace: 'default',
    policy_id: '',
    enabled: true,
    inputs: [],
  });

  // Validation state
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const [hasAgentPolicyError, setHasAgentPolicyError] = useState<boolean>(false);
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Update agent policy method
  const updateAgentPolicy = useCallback(
    (updatedAgentPolicy: AgentPolicy | undefined) => {
      if (updatedAgentPolicy) {
        setAgentPolicy(updatedAgentPolicy);
        if (packageInfo) {
          setHasAgentPolicyError(false);
        }
      } else {
        setHasAgentPolicyError(true);
        setAgentPolicy(undefined);
      }

      // eslint-disable-next-line no-console
      console.debug('Agent policy updated', updatedAgentPolicy);
    },
    [packageInfo, setAgentPolicy]
  );
  // Update package policy validation
  const updatePackagePolicyValidation = useCallback(
    (newPackagePolicy?: NewPackagePolicy) => {
      if (packageInfo) {
        const newValidationResult = validatePackagePolicy(
          newPackagePolicy || packagePolicy,
          packageInfo,
          safeLoad
        );
        setValidationResults(newValidationResult);
        // eslint-disable-next-line no-console
        console.debug('Package policy validation results', newValidationResult);

        return newValidationResult;
      }
    },
    [packagePolicy, packageInfo]
  );
  // Update package policy method
  const updatePackagePolicy = useCallback(
    (updatedFields: Partial<NewPackagePolicy>) => {
      const newPackagePolicy = {
        ...packagePolicy,
        ...updatedFields,
      };
      setPackagePolicy(newPackagePolicy);

      // eslint-disable-next-line no-console
      console.debug('Package policy updated', newPackagePolicy);
      const newValidationResults = updatePackagePolicyValidation(newPackagePolicy);
      const hasPackage = newPackagePolicy.package;
      const hasValidationErrors = newValidationResults
        ? validationHasErrors(newValidationResults)
        : false;
      const hasAgentPolicy = newPackagePolicy.policy_id && newPackagePolicy.policy_id !== '';
      if (
        hasPackage &&
        (hasAgentPolicy || selectedPolicyTab === SelectedPolicyTab.NEW) &&
        !hasValidationErrors
      ) {
        setFormState('VALID');
      } else {
        setFormState('INVALID');
      }
    },
    [packagePolicy, setFormState, updatePackagePolicyValidation, selectedPolicyTab]
  );

  const onSaveNavigate = useOnSaveNavigate({
    packagePolicy,
    queryParamsPolicyId,
  });

  const navigateAddAgent = (policy?: PackagePolicy) =>
    onSaveNavigate(policy, ['openEnrollmentFlyout']);

  const navigateAddAgentHelp = (policy?: PackagePolicy) =>
    onSaveNavigate(policy, ['showAddAgentHelp']);

  const onSubmit = useCallback(
    async ({
      force,
      overrideCreatedAgentPolicy,
    }: { overrideCreatedAgentPolicy?: AgentPolicy; force?: boolean } = {}) => {
      if (formState === 'VALID' && hasErrors) {
        setFormState('INVALID');
        return;
      }
      if (agentCount !== 0 && formState !== 'CONFIRM') {
        setFormState('CONFIRM');
        return;
      }
      let createdPolicy = overrideCreatedAgentPolicy;
      if (selectedPolicyTab === SelectedPolicyTab.NEW && !overrideCreatedAgentPolicy) {
        try {
          setFormState('LOADING');
          if ((withSysMonitoring || newAgentPolicy.monitoring_enabled?.length) ?? 0 > 0) {
            const packagesToPreinstall: string[] = [];
            if (packageInfo) {
              packagesToPreinstall.push(packageInfo.name);
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

          createdPolicy = await createAgentPolicy({
            newAgentPolicy,
            packagePolicy,
            withSysMonitoring,
          });
          setAgentPolicy(createdPolicy);
          updatePackagePolicy({ policy_id: createdPolicy.id });
        } catch (e) {
          setFormState('VALID');
          notifications.toasts.addError(e, {
            title: i18n.translate('xpack.fleet.createAgentPolicy.errorNotificationTitle', {
              defaultMessage: 'Unable to create agent policy',
            }),
          });
          return;
        }
      }

      setFormState('LOADING');
      // passing pkgPolicy with policy_id here as setPackagePolicy doesn't propagate immediately
      const { error, data } = await savePackagePolicy({
        ...packagePolicy,
        policy_id: createdPolicy?.id ?? packagePolicy.policy_id,
        force,
      });
      setFormState(agentCount ? 'SUBMITTED' : 'SUBMITTED_NO_AGENTS');
      if (!error) {
        setSavedPackagePolicy(data!.item);

        const hasAgentsAssigned = agentCount && agentPolicy;
        if (!hasAgentsAssigned) {
          setFormState('SUBMITTED_NO_AGENTS');
          return;
        }
        onSaveNavigate(data!.item);

        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.createPackagePolicy.addedNotificationTitle', {
            defaultMessage: `'{packagePolicyName}' integration added.`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
          text: hasAgentsAssigned
            ? i18n.translate('xpack.fleet.createPackagePolicy.addedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentPolicyName}' policy.`,
                values: {
                  agentPolicyName: agentPolicy!.name,
                },
              })
            : undefined,
          'data-test-subj': 'packagePolicyCreateSuccessToast',
        });
      } else {
        if (isVerificationError(error)) {
          setFormState('VALID'); // don't show the add agent modal
          const forceInstall = await confirmForceInstall(packagePolicy.package!);

          if (forceInstall) {
            // skip creating the agent policy because it will have already been successfully created
            onSubmit({ overrideCreatedAgentPolicy: createdPolicy, force: true });
          }
          return;
        }
        notifications.toasts.addError(error, {
          title: 'Error',
        });
        setFormState('VALID');
      }
    },
    [
      formState,
      hasErrors,
      agentCount,
      selectedPolicyTab,
      packagePolicy,
      notifications.toasts,
      agentPolicy,
      onSaveNavigate,
      confirmForceInstall,
      newAgentPolicy,
      updatePackagePolicy,
      withSysMonitoring,
      packageInfo,
    ]
  );

  return {
    agentPolicy,
    updateAgentPolicy,
    packagePolicy,
    updatePackagePolicy,
    savedPackagePolicy,
    onSubmit,
    formState,
    setFormState,
    hasErrors,
    validationResults,
    setValidationResults,
    hasAgentPolicyError,
    setHasAgentPolicyError,
    // TODO check
    navigateAddAgent,
    navigateAddAgentHelp,
  };
}

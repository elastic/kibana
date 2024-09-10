/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { safeLoad } from 'js-yaml';

import { isEqual } from 'lodash';

import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
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
  sendGetPackagePolicies,
  useMultipleAgentPolicies,
} from '../../../../../hooks';
import { isVerificationError, packageToPackagePolicy } from '../../../../../services';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_SYSTEM_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../../../../../common';
import { getMaxPackageName } from '../../../../../../../../common/services';
import { useConfirmForceInstall } from '../../../../../../integrations/hooks';
import { validatePackagePolicy, validationHasErrors } from '../../services';
import type { PackagePolicyValidationResults } from '../../services';
import type { PackagePolicyFormState } from '../../types';
import { SelectedPolicyTab } from '../../components';
import { useOnSaveNavigate } from '../../hooks';
import { prepareInputPackagePolicyDataset } from '../../services/prepare_input_pkg_policy_dataset';
import {
  getAzureArmPropsFromPackagePolicy,
  getCloudFormationPropsFromPackagePolicy,
  getCloudShellUrlFromPackagePolicy,
} from '../../../../../../../components/cloud_security_posture/services';

import { useAgentless } from './setup_technology';

export async function createAgentPolicy({
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

export const createAgentPolicyIfNeeded = async ({
  selectedPolicyTab,
  withSysMonitoring,
  newAgentPolicy,
  packagePolicy,
  packageInfo,
}: {
  selectedPolicyTab: SelectedPolicyTab;
  withSysMonitoring: boolean;
  newAgentPolicy: NewAgentPolicy;
  packagePolicy: NewPackagePolicy;
  packageInfo?: PackageInfo;
}): Promise<AgentPolicy | undefined> => {
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
    return await createAgentPolicy({
      newAgentPolicy,
      packagePolicy,
      withSysMonitoring,
    });
  }
};

async function savePackagePolicy(pkgPolicy: CreatePackagePolicyRequest['body']) {
  const { policy, forceCreateNeeded } = await prepareInputPackagePolicyDataset(pkgPolicy);
  const result = await sendCreatePackagePolicy({
    ...policy,
    ...(forceCreateNeeded && { force: true }),
  });

  return result;
}

const DEFAULT_PACKAGE_POLICY = {
  name: '',
  description: '',
  namespace: '',
  policy_id: '',
  policy_ids: [''],
  enabled: true,
  inputs: [],
};

export function useOnSubmit({
  agentCount,
  selectedPolicyTab,
  newAgentPolicy,
  withSysMonitoring,
  queryParamsPolicyId,
  packageInfo,
  integrationToEnable,
  hasFleetAddAgentsPrivileges,
}: {
  packageInfo?: PackageInfo;
  newAgentPolicy: NewAgentPolicy;
  withSysMonitoring: boolean;
  selectedPolicyTab: SelectedPolicyTab;
  agentCount: number;
  queryParamsPolicyId: string | undefined;
  integrationToEnable?: string;
  hasFleetAddAgentsPrivileges: boolean;
}) {
  const { notifications } = useStartServices();
  const confirmForceInstall = useConfirmForceInstall();
  const spaceSettings = useSpaceSettingsContext();
  const { canUseMultipleAgentPolicies } = useMultipleAgentPolicies();

  // only used to store the resulting package policy once saved
  const [savedPackagePolicy, setSavedPackagePolicy] = useState<PackagePolicy>();
  // Form state
  const [formState, setFormState] = useState<PackagePolicyFormState>('VALID');

  // Used to render extension components only when package policy is initialized
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  // Used to initialize the package policy once
  const isInitializedRef = useRef(false);

  const [agentPolicies, setAgentPolicies] = useState<AgentPolicy[]>([]);
  // New package policy state
  const [packagePolicy, setPackagePolicy] = useState<NewPackagePolicy>({
    ...DEFAULT_PACKAGE_POLICY,
  });

  // Validation state
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const [hasAgentPolicyError, setHasAgentPolicyError] = useState<boolean>(false);
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  const { isAgentlessIntegration, isAgentlessAgentPolicy, isAgentlessPackagePolicy } =
    useAgentless();

  // Update agent policy method
  const updateAgentPolicies = useCallback(
    (updatedAgentPolicies: AgentPolicy[]) => {
      if (isEqual(updatedAgentPolicies, agentPolicies)) {
        return;
      }

      setAgentPolicies(updatedAgentPolicies);
      if (packageInfo) {
        setHasAgentPolicyError(false);
      }

      // eslint-disable-next-line no-console
      console.debug('Agent policy updated', updatedAgentPolicies);
    },
    [packageInfo, agentPolicies]
  );
  // Update package policy validation
  const updatePackagePolicyValidation = useCallback(
    (newPackagePolicy?: NewPackagePolicy) => {
      if (packageInfo) {
        const newValidationResult = validatePackagePolicy(
          newPackagePolicy || packagePolicy,
          packageInfo,
          safeLoad,
          spaceSettings
        );
        setValidationResults(newValidationResult);
        // eslint-disable-next-line no-console
        console.debug('Package policy validation results', newValidationResult);

        return newValidationResult;
      }
    },
    [packagePolicy, packageInfo, spaceSettings]
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
      const hasAgentPolicy =
        (newPackagePolicy.policy_ids.length > 0 && newPackagePolicy.policy_ids[0] !== '') ||
        selectedPolicyTab === SelectedPolicyTab.NEW;
      const isOrphaningPolicy =
        canUseMultipleAgentPolicies && newPackagePolicy.policy_ids.length === 0;
      if (hasPackage && (hasAgentPolicy || isOrphaningPolicy) && !hasValidationErrors) {
        setFormState('VALID');
      } else {
        setFormState('INVALID');
      }
    },
    [packagePolicy, updatePackagePolicyValidation, selectedPolicyTab, canUseMultipleAgentPolicies]
  );

  // Initial loading of package info
  useEffect(() => {
    async function init() {
      if (isInitializedRef.current || !packageInfo) {
        return;
      }

      // Fetch all packagePolicies having the package name
      const { data: packagePolicyData } = await sendGetPackagePolicies({
        perPage: SO_SEARCH_LIMIT,
        page: 1,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageInfo.name}`,
      });
      const incrementedName = getMaxPackageName(packageInfo.name, packagePolicyData?.items);

      isInitializedRef.current = true;
      updatePackagePolicy(
        packageToPackagePolicy(
          packageInfo,
          agentPolicies.map((policy) => policy.id),
          '',
          DEFAULT_PACKAGE_POLICY.name || incrementedName,
          DEFAULT_PACKAGE_POLICY.description,
          integrationToEnable
        )
      );
      setIsInitialized(true);
    }
    init();
  }, [packageInfo, agentPolicies, updatePackagePolicy, integrationToEnable, isInitialized]);

  useEffect(() => {
    if (
      agentPolicies.length > 0 &&
      !isEqual(
        agentPolicies.map((policy) => policy.id),
        packagePolicy.policy_ids
      )
    ) {
      updatePackagePolicy({
        policy_ids: agentPolicies.map((policy) => policy.id),
      });
    }
  }, [packagePolicy, agentPolicies, updatePackagePolicy]);

  const onSaveNavigate = useOnSaveNavigate({
    packagePolicy,
    queryParamsPolicyId,
  });

  const navigateAddAgent = (policy: PackagePolicy) =>
    onSaveNavigate(policy, ['openEnrollmentFlyout']);

  const navigateAddAgentHelp = (policy: PackagePolicy) =>
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
      if (
        (agentCount !== 0 ||
          (agentPolicies.length === 0 && selectedPolicyTab !== SelectedPolicyTab.NEW)) &&
        !(
          isAgentlessIntegration(packageInfo) ||
          isAgentlessPackagePolicy(packagePolicy) ||
          isAgentlessAgentPolicy(overrideCreatedAgentPolicy)
        ) &&
        formState !== 'CONFIRM'
      ) {
        setFormState('CONFIRM');
        return;
      }
      let createdPolicy = overrideCreatedAgentPolicy;
      if (!overrideCreatedAgentPolicy) {
        try {
          setFormState('LOADING');
          const newPolicy = await createAgentPolicyIfNeeded({
            newAgentPolicy,
            packagePolicy,
            withSysMonitoring,
            packageInfo,
            selectedPolicyTab,
          });
          if (newPolicy) {
            createdPolicy = newPolicy;
            setAgentPolicies([createdPolicy]);
            updatePackagePolicy({ policy_ids: [createdPolicy.id] });
          }
        } catch (e) {
          setFormState('VALID');
          const agentlessPolicy = agentPolicies.find(
            (policy) => policy?.supports_agentless === true
          );

          notifications.toasts.addError(e, {
            title: agentlessPolicy?.supports_agentless
              ? i18n.translate('xpack.fleet.createAgentlessPolicy.errorNotificationTitle', {
                  defaultMessage: 'Unable to create agentless integration',
                })
              : i18n.translate('xpack.fleet.createAgentPolicy.errorNotificationTitle', {
                  defaultMessage: 'Unable to create agent policy',
                }),
          });
          return;
        }
      }

      const agentPolicyIdToSave = createdPolicy?.id
        ? [createdPolicy?.id]
        : packagePolicy.policy_ids;

      const shouldForceInstallOnAgentless =
        isAgentlessAgentPolicy(createdPolicy) ||
        isAgentlessIntegration(packageInfo) ||
        isAgentlessPackagePolicy(packagePolicy);

      const forceInstall = force || shouldForceInstallOnAgentless;

      setFormState('LOADING');
      // passing pkgPolicy with policy_id here as setPackagePolicy doesn't propagate immediately
      const { error, data } = await savePackagePolicy({
        ...packagePolicy,
        policy_ids: agentPolicyIdToSave,
        force: forceInstall,
      });

      const hasAzureArmTemplate = data?.item
        ? getAzureArmPropsFromPackagePolicy(data.item).templateUrl
        : false;

      const hasCloudFormation = data?.item
        ? getCloudFormationPropsFromPackagePolicy(data.item).templateUrl
        : false;

      const hasGoogleCloudShell = data?.item ? getCloudShellUrlFromPackagePolicy(data.item) : false;

      // Check if agentless is configured in ESS and Serverless until Agentless API migrates to Serverless
      const isAgentlessConfigured =
        isAgentlessAgentPolicy(createdPolicy) || isAgentlessPackagePolicy(data!.item);

      // Removing this code will disabled the Save and Continue button. We need code below update form state and trigger correct modal depending on agent count
      if (hasFleetAddAgentsPrivileges && !isAgentlessConfigured) {
        if (agentCount) {
          setFormState('SUBMITTED');
        } else if (hasAzureArmTemplate) {
          setFormState('SUBMITTED_AZURE_ARM_TEMPLATE');
        } else if (hasCloudFormation) {
          setFormState('SUBMITTED_CLOUD_FORMATION');
        } else if (hasGoogleCloudShell) {
          setFormState('SUBMITTED_GOOGLE_CLOUD_SHELL');
        } else {
          setFormState('SUBMITTED_NO_AGENTS');
        }
      }

      if (!error) {
        setSavedPackagePolicy(data!.item);

        const promptForAgentEnrollment =
          (createdPolicy || (agentPolicies.length > 0 && !agentCount)) &&
          !isAgentlessConfigured &&
          hasFleetAddAgentsPrivileges;

        if (promptForAgentEnrollment && hasAzureArmTemplate) {
          setFormState('SUBMITTED_AZURE_ARM_TEMPLATE');
          return;
        }
        if (promptForAgentEnrollment && hasCloudFormation) {
          setFormState('SUBMITTED_CLOUD_FORMATION');
          return;
        }
        if (promptForAgentEnrollment && hasGoogleCloudShell) {
          setFormState('SUBMITTED_GOOGLE_CLOUD_SHELL');
          return;
        }
        if (promptForAgentEnrollment) {
          setFormState('SUBMITTED_NO_AGENTS');
          return;
        }
        onSaveNavigate(data!.item);

        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.createPackagePolicy.addedNotificationTitle', {
            defaultMessage: `''{packagePolicyName}'' integration added.`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
          text: promptForAgentEnrollment
            ? i18n.translate('xpack.fleet.createPackagePolicy.addedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the ''{agentPolicyNames}'' policies.`,
                values: {
                  agentPolicyNames: agentPolicies.map((policy) => policy.name).join(', '),
                },
              })
            : undefined,
          'data-test-subj': 'packagePolicyCreateSuccessToast',
        });
      } else {
        if (isVerificationError(error)) {
          setFormState('VALID'); // don't show the add agent modal
          const forceInstallUnverifiedIntegration = await confirmForceInstall(
            packagePolicy.package!
          );

          if (forceInstallUnverifiedIntegration) {
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
      isAgentlessIntegration,
      packageInfo,
      selectedPolicyTab,
      packagePolicy,
      isAgentlessAgentPolicy,
      isAgentlessPackagePolicy,
      hasFleetAddAgentsPrivileges,
      withSysMonitoring,
      newAgentPolicy,
      updatePackagePolicy,
      notifications.toasts,
      agentPolicies,
      onSaveNavigate,
      confirmForceInstall,
    ]
  );

  return {
    agentPolicies,
    updateAgentPolicies,
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
    isInitialized,
    // TODO check
    navigateAddAgent,
    navigateAddAgentHelp,
  };
}

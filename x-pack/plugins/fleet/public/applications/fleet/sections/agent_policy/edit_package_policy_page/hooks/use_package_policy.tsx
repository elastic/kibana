/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { safeLoad } from 'js-yaml';
import deepEqual from 'fast-deep-equal';
import { pick } from 'lodash';

import type {
  GetOnePackagePolicyResponse,
  UpgradePackagePolicyDryRunResponse,
} from '../../../../../../../common/types/rest_spec';
import {
  sendBulkGetAgentPolicies,
  sendGetOnePackagePolicy,
  sendGetPackageInfoByKey,
  sendGetSettings,
  sendUpdatePackagePolicy,
  sendUpgradePackagePolicyDryRun,
} from '../../../../hooks';
import type {
  PackagePolicyConfigRecord,
  UpdatePackagePolicy,
  AgentPolicy,
  PackagePolicy,
  PackageInfo,
} from '../../../../types';
import {
  type PackagePolicyValidationResults,
  validatePackagePolicy,
  validationHasErrors,
} from '../../create_package_policy_page/services';
import type { PackagePolicyFormState } from '../../create_package_policy_page/types';
import { fixApmDurationVars, hasUpgradeAvailable } from '../utils';
import { prepareInputPackagePolicyDataset } from '../../create_package_policy_page/services/prepare_input_pkg_policy_dataset';

function mergeVars(
  packageVars?: PackagePolicyConfigRecord,
  userVars: PackagePolicyConfigRecord = {}
): PackagePolicyConfigRecord {
  if (!packageVars) {
    return {};
  }

  return Object.entries(packageVars).reduce((acc, [varKey, varRecord]) => {
    acc[varKey] = {
      ...varRecord,
      value: userVars?.[varKey]?.value ?? varRecord.value,
    };

    return acc;
  }, {} as PackagePolicyConfigRecord);
}

async function isPreleaseEnabled() {
  const { data: settings } = await sendGetSettings();

  return Boolean(settings?.item.prerelease_integrations_enabled);
}

export function usePackagePolicyWithRelatedData(
  packagePolicyId: string,
  options: {
    forceUpgrade?: boolean;
  }
) {
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [packagePolicy, setPackagePolicy] = useState<UpdatePackagePolicy>({
    name: '',
    description: '',
    namespace: '',
    policy_id: '',
    policy_ids: [''],
    enabled: true,
    inputs: [],
    version: '',
  });
  const [originalPackagePolicy, setOriginalPackagePolicy] =
    useState<GetOnePackagePolicyResponse['item']>();
  const [agentPolicies, setAgentPolicies] = useState<AgentPolicy[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [dryRunData, setDryRunData] = useState<UpgradePackagePolicyDryRunResponse>();
  const [loadingError, setLoadingError] = useState<Error>();

  const [isUpgrade, setIsUpgrade] = useState<boolean>(options.forceUpgrade ?? false);

  // Form state
  const [isEdited, setIsEdited] = useState(false);
  const [formState, setFormState] = useState<PackagePolicyFormState>('INVALID');
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  const savePackagePolicy = async (packagePolicyOverride?: Partial<PackagePolicy>) => {
    setFormState('LOADING');
    const {
      policy: { elasticsearch, ...restPackagePolicy },
    } = await prepareInputPackagePolicyDataset({
      ...packagePolicy,
      ...(packagePolicyOverride ?? {}),
    });
    const result = await sendUpdatePackagePolicy(packagePolicyId, restPackagePolicy);

    setFormState('SUBMITTED');

    return result;
  };
  // Update package policy validation
  const updatePackagePolicyValidation = useCallback(
    (newPackagePolicy?: UpdatePackagePolicy) => {
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
    (updatedFields: Partial<UpdatePackagePolicy>) => {
      const isDeepEqual = deepEqual(
        JSON.parse(JSON.stringify(updatedFields)),
        JSON.parse(JSON.stringify(pick(packagePolicy, Object.keys(updatedFields))))
      );

      if (!isDeepEqual) {
        setIsEdited(true);
      }

      const newPackagePolicy = {
        ...packagePolicy,
        ...updatedFields,
      };
      setPackagePolicy(newPackagePolicy);

      // eslint-disable-next-line no-console
      console.debug('Package policy updated', newPackagePolicy);
      const newValidationResults = updatePackagePolicyValidation(newPackagePolicy);
      const hasValidationErrors = newValidationResults
        ? validationHasErrors(newValidationResults)
        : false;
      if (!hasValidationErrors) {
        setFormState('VALID');
      } else {
        setFormState('INVALID');
      }
    },
    [packagePolicy, updatePackagePolicyValidation]
  );

  // Load the package policy and related data
  useEffect(() => {
    const getData = async () => {
      setIsLoadingData(true);
      setLoadingError(undefined);
      try {
        const prerelease = await isPreleaseEnabled();

        const { data: packagePolicyData, error: packagePolicyError } =
          await sendGetOnePackagePolicy(packagePolicyId);

        if (packagePolicyError) {
          throw packagePolicyError;
        }

        if (packagePolicyData!.item.policy_ids && packagePolicyData!.item.policy_ids.length > 0) {
          const { data, error: agentPolicyError } = await sendBulkGetAgentPolicies(
            packagePolicyData!.item.policy_ids
          );

          if (agentPolicyError) {
            throw agentPolicyError;
          }

          setAgentPolicies(data?.items ?? []);
        }

        const { data: upgradePackagePolicyDryRunData, error: upgradePackagePolicyDryRunError } =
          await sendUpgradePackagePolicyDryRun([packagePolicyId]);

        if (upgradePackagePolicyDryRunError) {
          throw upgradePackagePolicyDryRunError;
        }

        const hasUpgrade = upgradePackagePolicyDryRunData
          ? hasUpgradeAvailable(upgradePackagePolicyDryRunData)
          : false;

        const isUpgradeScenario = options.forceUpgrade && hasUpgrade;
        // If the dry run data doesn't indicate a difference in version numbers, flip the form back
        // to its non-upgrade state, even if we were initially set to the upgrade view
        if (!hasUpgrade) {
          setIsUpgrade(false);
        }

        if (upgradePackagePolicyDryRunData && hasUpgrade) {
          setDryRunData(upgradePackagePolicyDryRunData);
        }

        const basePolicy: PackagePolicy | undefined = packagePolicyData?.item;
        let baseInputs: any = basePolicy?.inputs;
        let basePackage: any = basePolicy?.package;
        let baseVars = basePolicy?.vars;

        const proposedUpgradePackagePolicy = upgradePackagePolicyDryRunData?.[0]?.diff?.[1];

        if (isUpgradeScenario) {
          if (!proposedUpgradePackagePolicy) {
            throw new Error(
              'There was an error when trying to load upgrade diff for that package policy'
            );
          }
          // If we're upgrading the package, we need to "start from" the policy as it's returned from
          // the dry run so we can allow the user to edit any new variables before saving + upgrading
          baseInputs = proposedUpgradePackagePolicy.inputs;
          basePackage = proposedUpgradePackagePolicy.package;
          baseVars = proposedUpgradePackagePolicy.vars;
        }

        if (basePolicy) {
          setOriginalPackagePolicy(basePolicy);

          const {
            id,
            revision,
            inputs,
            vars,
            /* eslint-disable @typescript-eslint/naming-convention */
            created_by,
            created_at,
            updated_by,
            updated_at,
            secret_references,
            /* eslint-enable @typescript-eslint/naming-convention */
            ...restOfPackagePolicy
          } = basePolicy;

          // const newVars = baseVars;

          // Remove `compiled_stream` from all stream info, we assign this after saving
          const newPackagePolicy: UpdatePackagePolicy = {
            ...restOfPackagePolicy,
            // If we're upgrading, we need to make sure we catch an addition of package-level
            // vars when they were previously no package-level vars defined
            vars: mergeVars(baseVars, vars),
            inputs: baseInputs.map((input: any) => {
              // Remove `compiled_input` from all input info, we assign this after saving
              const {
                streams,
                compiled_input: compiledInput,
                vars: inputVars,
                ...restOfInput
              } = input;

              const basePolicyInputVars: any =
                isUpgradeScenario &&
                basePolicy.inputs.find(
                  (i) => i.type === input.type && i.policy_template === input.policy_template
                )?.vars;
              let newInputVars = inputVars;
              if (basePolicyInputVars && inputVars) {
                // merging vars from dry run with updated ones
                newInputVars = mergeVars(inputVars, basePolicyInputVars);
              }
              // Fix duration vars, if it's a migrated setting, and it's a plain old number with no suffix
              if (basePackage.name === 'apm') {
                newInputVars = fixApmDurationVars(newInputVars);
              }
              return {
                ...restOfInput,
                streams: streams.map((stream: any) => {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  const { compiled_stream, ...restOfStream } = stream;
                  return restOfStream;
                }),
                vars: newInputVars,
              };
            }),
            package: basePackage,
          };

          setPackagePolicy(newPackagePolicy);

          if (basePolicy.package) {
            let _packageInfo = basePolicy.package;

            // When upgrading, we need to grab the `packageInfo` data from the new package version's
            // proposed policy (comes from the dry run diff) to ensure we have the valid package key/version
            // before saving
            if (isUpgradeScenario && !!upgradePackagePolicyDryRunData?.[0]?.diff?.[1]?.package) {
              _packageInfo = upgradePackagePolicyDryRunData[0].diff?.[1]?.package;
            }

            const { data: packageData } = await sendGetPackageInfoByKey(
              _packageInfo!.name,
              _packageInfo!.version,
              { prerelease, full: true }
            );

            if (packageData?.item) {
              setPackageInfo(packageData.item);

              const newValidationResults = validatePackagePolicy(
                newPackagePolicy,
                packageData.item,
                safeLoad
              );
              setValidationResults(newValidationResults);

              if (validationHasErrors(newValidationResults)) {
                setFormState('INVALID');
              } else {
                setFormState('VALID');
              }
            }
          }
        }
      } catch (e) {
        setLoadingError(e);
      }
      setIsLoadingData(false);
    };
    getData();
  }, [packagePolicyId, options.forceUpgrade]);

  return {
    // form
    formState,
    validationResults,
    hasErrors,
    upgradeDryRunData: dryRunData,
    setFormState,
    updatePackagePolicy,
    isEdited,
    setIsEdited,
    // data
    packageInfo,
    isUpgrade,
    savePackagePolicy,
    isLoadingData,
    agentPolicies,
    loadingError,
    packagePolicy,
    originalPackagePolicy,
  };
}

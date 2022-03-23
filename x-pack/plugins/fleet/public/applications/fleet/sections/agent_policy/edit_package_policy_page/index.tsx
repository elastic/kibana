/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { safeLoad } from 'js-yaml';
import {
  EuiButtonEmpty,
  EuiBottomBar,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLink,
  EuiFlyout,
  EuiCodeBlock,
  EuiPortal,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiErrorBoundary,
} from '@elastic/eui';
import styled from 'styled-components';

import type { AgentPolicy, PackageInfo, UpdatePackagePolicy, PackagePolicy } from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  useStartServices,
  useConfig,
  useUIExtension,
  sendUpdatePackagePolicy,
  sendGetAgentStatus,
  sendGetOneAgentPolicy,
  sendGetOnePackagePolicy,
  sendGetPackageInfoByKey,
  sendUpgradePackagePolicyDryRun,
  useAuthz,
} from '../../../hooks';
import {
  useBreadcrumbs as useIntegrationsBreadcrumbs,
  useGetOnePackagePolicy,
} from '../../../../integrations/hooks';
import { Loading, Error, ExtensionWrapper } from '../../../components';
import { ConfirmDeployAgentPolicyModal } from '../components';
import { CreatePackagePolicyPageLayout } from '../create_package_policy_page/components';
import type { PackagePolicyValidationResults } from '../create_package_policy_page/services';
import { validatePackagePolicy, validationHasErrors } from '../create_package_policy_page/services';
import type {
  PackagePolicyFormState,
  EditPackagePolicyFrom,
} from '../create_package_policy_page/types';
import { StepConfigurePackagePolicy } from '../create_package_policy_page/step_configure_package';
import { StepDefinePackagePolicy } from '../create_package_policy_page/step_define_package_policy';
import type {
  GetOnePackagePolicyResponse,
  UpgradePackagePolicyDryRunResponse,
} from '../../../../../../common/types/rest_spec';
import type { PackagePolicyEditExtensionComponentProps } from '../../../types';
import { pkgKeyFromPackageInfo } from '../../../services';
import { EuiButtonWithTooltip } from '../../../../integrations/sections/epm/screens/detail';

import { fixApmDurationVars, hasUpgradeAvailable } from './utils';

export const EditPackagePolicyPage = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ policyId: string; packagePolicyId: string }>();

  const packagePolicy = useGetOnePackagePolicy(packagePolicyId);

  const extensionView = useUIExtension(
    packagePolicy.data?.item?.package?.name ?? '',
    'package-policy-edit'
  );

  return (
    <EditPackagePolicyForm
      packagePolicyId={packagePolicyId}
      // If an extension opts in to this `useLatestPackageVersion` flag, we want to display
      // the edit form in an "upgrade" state regardless of whether the user intended to
      // "edit" their policy or "upgrade" it. This ensures the new policy generated will be
      // set to use the latest version of the package, not its current version.
      forceUpgrade={extensionView?.useLatestPackageVersion}
    />
  );
});

export const EditPackagePolicyForm = memo<{
  packagePolicyId: string;
  forceUpgrade?: boolean;
  from?: EditPackagePolicyFrom;
}>(({ packagePolicyId, forceUpgrade = false, from = 'edit' }) => {
  const { application, notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const { getHref } = useLink();

  // Agent policy, package info, and package policy states
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<Error>();
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [packagePolicy, setPackagePolicy] = useState<UpdatePackagePolicy>({
    name: '',
    description: '',
    namespace: '',
    policy_id: '',
    enabled: true,
    output_id: '',
    inputs: [],
    version: '',
  });
  const [originalPackagePolicy, setOriginalPackagePolicy] =
    useState<GetOnePackagePolicyResponse['item']>();
  const [dryRunData, setDryRunData] = useState<UpgradePackagePolicyDryRunResponse>();

  const [isUpgrade, setIsUpgrade] = useState<boolean>(false);

  const canWriteIntegrationPolicies = useAuthz().integrations.writeIntegrationPolicies;

  useEffect(() => {
    if (forceUpgrade) {
      setIsUpgrade(true);
    }
  }, [forceUpgrade]);

  const policyId = agentPolicy?.id ?? '';

  // Retrieve agent policy, package, and package policy info
  useEffect(() => {
    const getData = async () => {
      setIsLoadingData(true);
      setLoadingError(undefined);
      try {
        const { data: packagePolicyData, error: packagePolicyError } =
          await sendGetOnePackagePolicy(packagePolicyId);

        if (packagePolicyError) {
          throw packagePolicyError;
        }

        const { data: agentPolicyData, error: agentPolicyError } = await sendGetOneAgentPolicy(
          packagePolicyData!.item.policy_id
        );

        if (agentPolicyError) {
          throw agentPolicyError;
        }

        if (agentPolicyData?.item) {
          setAgentPolicy(agentPolicyData.item);
        }

        const { data: upgradePackagePolicyDryRunData, error: upgradePackagePolicyDryRunError } =
          await sendUpgradePackagePolicyDryRun([packagePolicyId]);

        if (upgradePackagePolicyDryRunError) {
          throw upgradePackagePolicyDryRunError;
        }

        const hasUpgrade = upgradePackagePolicyDryRunData
          ? hasUpgradeAvailable(upgradePackagePolicyDryRunData)
          : false;

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

        const proposedUpgradePackagePolicy = upgradePackagePolicyDryRunData?.[0]?.diff?.[1];

        // If we're upgrading the package, we need to "start from" the policy as it's returned from
        // the dry run so we can allow the user to edit any new variables before saving + upgrading
        if (isUpgrade && !!proposedUpgradePackagePolicy) {
          baseInputs = proposedUpgradePackagePolicy.inputs;
          basePackage = proposedUpgradePackagePolicy.package;
        }

        if (basePolicy) {
          setOriginalPackagePolicy(basePolicy);

          const {
            id,
            revision,
            inputs,
            /* eslint-disable @typescript-eslint/naming-convention */
            created_by,
            created_at,
            updated_by,
            updated_at,
            /* eslint-enable @typescript-eslint/naming-convention */
            ...restOfPackagePolicy
          } = basePolicy as any;
          // Remove `compiled_stream` from all stream info, we assign this after saving
          const newPackagePolicy = {
            ...restOfPackagePolicy,
            inputs: baseInputs.map((input: any) => {
              // Remove `compiled_input` from all input info, we assign this after saving
              const { streams, compiled_input: compiledInput, vars, ...restOfInput } = input;
              let basePolicyInputVars: any =
                isUpgrade &&
                basePolicy.inputs.find(
                  (i) => i.type === input.type && i.policy_template === input.policy_template
                )?.vars;
              let newVars = vars;
              if (basePolicyInputVars && vars) {
                // merging vars from dry run with updated ones
                basePolicyInputVars = Object.keys(vars).reduce(
                  (acc, curr) => ({ ...acc, [curr]: basePolicyInputVars[curr] }),
                  {}
                );
                newVars = {
                  ...vars,
                  ...basePolicyInputVars,
                };
              }
              // Fix duration vars, if it's a migrated setting, and it's a plain old number with no suffix
              if (basePackage.name === 'apm') {
                newVars = fixApmDurationVars(newVars);
              }
              return {
                ...restOfInput,
                streams: streams.map((stream: any) => {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  const { compiled_stream, ...restOfStream } = stream;
                  return restOfStream;
                }),
                vars: newVars,
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
            if (isUpgrade && !!upgradePackagePolicyDryRunData?.[0]?.diff?.[1]?.package) {
              _packageInfo = upgradePackagePolicyDryRunData[0].diff?.[1]?.package;
            }

            const { data: packageData } = await sendGetPackageInfoByKey(
              _packageInfo!.name,
              _packageInfo!.version
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
  }, [policyId, packagePolicyId, isUpgrade]);

  // Retrieve agent count
  const [agentCount, setAgentCount] = useState<number>(0);
  useEffect(() => {
    const getAgentCount = async () => {
      const { data } = await sendGetAgentStatus({ policyId });
      if (data?.results.total) {
        setAgentCount(data.results.total);
      }
    };

    if (isFleetEnabled && policyId) {
      getAgentCount();
    }
  }, [policyId, isFleetEnabled]);

  // Package policy validation state
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

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
      setIsEdited(true);
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

  const handleExtensionViewOnChange = useCallback<
    PackagePolicyEditExtensionComponentProps['onChange']
  >(
    ({ isValid, updatedPolicy }) => {
      updatePackagePolicy(updatedPolicy);
      setFormState((prevState) => {
        if (prevState === 'VALID' && !isValid) {
          return 'INVALID';
        }
        return prevState;
      });
    },
    [updatePackagePolicy]
  );

  // Cancel url + Success redirect Path:
  //  if `from === 'edit'` then it links back to Policy Details
  //  if `from === 'package-edit'`, or `upgrade-from-integrations-policy-list` then it links back to the Integration Policy List
  const cancelUrl = useMemo((): string => {
    if (packageInfo && policyId) {
      return from === 'package-edit'
        ? getHref('integration_details_policies', {
            pkgkey: pkgKeyFromPackageInfo(packageInfo!),
          })
        : getHref('policy_details', { policyId });
    }
    return '/';
  }, [from, getHref, packageInfo, policyId]);

  const successRedirectPath = useMemo(() => {
    if (packageInfo && policyId) {
      return from === 'package-edit' || from === 'upgrade-from-integrations-policy-list'
        ? getHref('integration_details_policies', {
            pkgkey: pkgKeyFromPackageInfo(packageInfo!),
          })
        : getHref('policy_details', { policyId });
    }
    return '/';
  }, [from, getHref, packageInfo, policyId]);

  // Save package policy
  const [isEdited, setIsEdited] = useState(false);
  const [formState, setFormState] = useState<PackagePolicyFormState>('INVALID');
  const savePackagePolicy = async () => {
    setFormState('LOADING');
    const { elasticsearch, ...restPackagePolicy } = packagePolicy; // ignore 'elasticsearch' property since it fails route validation
    const result = await sendUpdatePackagePolicy(packagePolicyId, restPackagePolicy);
    setFormState('SUBMITTED');
    return result;
  };

  const onSubmit = async () => {
    if (formState === 'VALID' && hasErrors) {
      setFormState('INVALID');
      return;
    }
    if (agentCount !== 0 && formState !== 'CONFIRM') {
      setFormState('CONFIRM');
      return;
    }

    const { error } = await savePackagePolicy();
    if (!error) {
      application.navigateToUrl(successRedirectPath);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.editPackagePolicy.updatedNotificationTitle', {
          defaultMessage: `Successfully updated '{packagePolicyName}'`,
          values: {
            packagePolicyName: packagePolicy.name,
          },
        }),
        'data-test-subj': 'policyUpdateSuccessToast',
        text:
          agentCount && agentPolicy
            ? i18n.translate('xpack.fleet.editPackagePolicy.updatedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentPolicyName}' policy`,
                values: {
                  agentPolicyName: agentPolicy.name,
                },
              })
            : undefined,
      });
    } else {
      if (error.statusCode === 409) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.editPackagePolicy.failedNotificationTitle', {
            defaultMessage: `Error updating '{packagePolicyName}'`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
          toastMessage: i18n.translate(
            'xpack.fleet.editPackagePolicy.failedConflictNotificationMessage',
            {
              defaultMessage: `Data is out of date. Refresh the page to get the latest policy.`,
            }
          ),
        });
      } else {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.editPackagePolicy.failedNotificationTitle', {
            defaultMessage: `Error updating '{packagePolicyName}'`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
        });
      }
      setFormState('VALID');
    }
  };

  const extensionView = useUIExtension(packagePolicy.package?.name ?? '', 'package-policy-edit');
  const extensionTabsView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-policy-edit-tabs'
  );
  const tabsViews = extensionTabsView?.tabs;
  const [selectedTab, setSelectedTab] = useState(0);

  const layoutProps = {
    from: extensionView?.useLatestPackageVersion && isUpgrade ? 'upgrade-from-extension' : from,
    cancelUrl,
    agentPolicy,
    packageInfo,
    tabs: tabsViews?.length
      ? [
          {
            title: i18n.translate('xpack.fleet.editPackagePolicy.settingsTabName', {
              defaultMessage: 'Settings',
            }),
            isSelected: selectedTab === 0,
            onClick: () => {
              setSelectedTab(0);
            },
          },
          ...tabsViews.map(({ title }, index) => ({
            title,
            isSelected: selectedTab === index + 1,
            onClick: () => {
              setSelectedTab(index + 1);
            },
          })),
        ]
      : [],
  };

  const configurePackage = useMemo(
    () =>
      agentPolicy && packageInfo ? (
        <>
          {selectedTab === 0 && (
            <StepDefinePackagePolicy
              agentPolicy={agentPolicy}
              packageInfo={packageInfo}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults!}
              submitAttempted={formState === 'INVALID'}
              isUpdate={true}
            />
          )}

          {/* Only show the out-of-box configuration step if a UI extension is NOT registered */}
          {!extensionView && selectedTab === 0 && (
            <StepConfigurePackagePolicy
              packageInfo={packageInfo}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults!}
              submitAttempted={formState === 'INVALID'}
            />
          )}

          {extensionView &&
            packagePolicy.policy_id &&
            packagePolicy.package?.name &&
            originalPackagePolicy && (
              <ExtensionWrapper>
                {selectedTab > 0 && tabsViews ? (
                  React.createElement(tabsViews[selectedTab - 1].Component, {
                    policy: originalPackagePolicy,
                    newPolicy: packagePolicy,
                    onChange: handleExtensionViewOnChange,
                  })
                ) : (
                  <extensionView.Component
                    policy={originalPackagePolicy}
                    newPolicy={packagePolicy}
                    onChange={handleExtensionViewOnChange}
                  />
                )}
              </ExtensionWrapper>
            )}
        </>
      ) : null,
    [
      agentPolicy,
      packageInfo,
      packagePolicy,
      updatePackagePolicy,
      validationResults,
      formState,
      originalPackagePolicy,
      extensionView,
      handleExtensionViewOnChange,
      selectedTab,
      tabsViews,
    ]
  );

  return (
    <CreatePackagePolicyPageLayout {...layoutProps} data-test-subj="editPackagePolicy">
      <EuiErrorBoundary>
        {isLoadingData ? (
          <Loading />
        ) : loadingError || !agentPolicy || !packageInfo ? (
          <Error
            title={
              <FormattedMessage
                id="xpack.fleet.editPackagePolicy.errorLoadingDataTitle"
                defaultMessage="Error loading data"
              />
            }
            error={
              loadingError ||
              i18n.translate('xpack.fleet.editPackagePolicy.errorLoadingDataMessage', {
                defaultMessage: 'There was an error loading this integration information',
              })
            }
          />
        ) : (
          <>
            <Breadcrumb
              agentPolicyName={agentPolicy.name}
              from={from}
              packagePolicyName={packagePolicy.name}
              pkgkey={pkgKeyFromPackageInfo(packageInfo)}
              pkgTitle={packageInfo.title}
              policyId={policyId}
            />
            {formState === 'CONFIRM' && (
              <ConfirmDeployAgentPolicyModal
                agentCount={agentCount}
                agentPolicy={agentPolicy}
                onConfirm={onSubmit}
                onCancel={() => setFormState('VALID')}
              />
            )}
            {isUpgrade && dryRunData && (
              <>
                <UpgradeStatusCallout dryRunData={dryRunData} />
                <EuiSpacer size="xxl" />
              </>
            )}
            {configurePackage}
            {/* Extra space to accomodate the EuiBottomBar height */}
            <EuiSpacer size="xxl" />
            <EuiSpacer size="xxl" />
            <EuiBottomBar>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  {agentPolicy && packageInfo && formState === 'INVALID' ? (
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.errorOnSaveText"
                      defaultMessage="Your integration policy has errors. Please fix them before saving."
                    />
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty color="ghost" href={cancelUrl}>
                        <FormattedMessage
                          id="xpack.fleet.editPackagePolicy.cancelButton"
                          defaultMessage="Cancel"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonWithTooltip
                        onClick={onSubmit}
                        isLoading={formState === 'LOADING'}
                        // Allow to save only if the package policy is upgraded or had been edited
                        isDisabled={
                          !canWriteIntegrationPolicies ||
                          formState !== 'VALID' ||
                          (!isEdited && !isUpgrade)
                        }
                        tooltip={
                          !canWriteIntegrationPolicies
                            ? {
                                content: (
                                  <FormattedMessage
                                    id="xpack.fleet.agentPolicy.saveIntegrationTooltip"
                                    defaultMessage="To save the integration policy, you must have security enabled and have the All privilege for Integrations. Contact your administrator."
                                  />
                                ),
                              }
                            : undefined
                        }
                        iconType="save"
                        color="primary"
                        fill
                        data-test-subj="saveIntegration"
                      >
                        {isUpgrade ? (
                          <FormattedMessage
                            id="xpack.fleet.editPackagePolicy.upgradeButton"
                            defaultMessage="Upgrade integration"
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.fleet.editPackagePolicy.saveButton"
                            defaultMessage="Save integration"
                          />
                        )}
                      </EuiButtonWithTooltip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiBottomBar>
          </>
        )}
      </EuiErrorBoundary>
    </CreatePackagePolicyPageLayout>
  );
});

const Breadcrumb = memo<{
  agentPolicyName: string;
  from: EditPackagePolicyFrom;
  packagePolicyName: string;
  pkgkey: string;
  pkgTitle: string;
  policyId: string;
}>(({ agentPolicyName, from, packagePolicyName, pkgkey, pkgTitle, policyId }) => {
  let breadcrumb = <PoliciesBreadcrumb policyName={agentPolicyName} policyId={policyId} />;

  if (
    from === 'package' ||
    from === 'package-edit' ||
    from === 'upgrade-from-integrations-policy-list'
  ) {
    breadcrumb = (
      <IntegrationsBreadcrumb pkgkey={pkgkey} pkgTitle={pkgTitle} policyName={packagePolicyName} />
    );
  } else if (from === 'upgrade-from-fleet-policy-list') {
    breadcrumb = <UpgradeBreadcrumb policyName={agentPolicyName} policyId={policyId} />;
  }

  return breadcrumb;
});

const IntegrationsBreadcrumb = memo<{
  pkgTitle: string;
  policyName: string;
  pkgkey: string;
}>(({ pkgTitle, policyName, pkgkey }) => {
  useIntegrationsBreadcrumbs('integration_policy_edit', { policyName, pkgTitle, pkgkey });
  return null;
});

const PoliciesBreadcrumb: React.FunctionComponent<{
  policyName: string;
  policyId: string;
}> = ({ policyName, policyId }) => {
  useBreadcrumbs('edit_integration', { policyName, policyId });
  return null;
};

const UpgradeBreadcrumb: React.FunctionComponent<{
  policyName: string;
  policyId: string;
}> = ({ policyName, policyId }) => {
  useBreadcrumbs('upgrade_package_policy', { policyName, policyId });
  return null;
};

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

const UpgradeStatusCallout: React.FunctionComponent<{
  dryRunData: UpgradePackagePolicyDryRunResponse;
}> = ({ dryRunData }) => {
  const [isPreviousVersionFlyoutOpen, setIsPreviousVersionFlyoutOpen] = useState<boolean>(false);

  if (!dryRunData) {
    return null;
  }

  const isReadyForUpgrade = !dryRunData[0].hasErrors;

  const [currentPackagePolicy, proposedUpgradePackagePolicy] = dryRunData[0].diff || [];

  return (
    <>
      {isPreviousVersionFlyoutOpen && currentPackagePolicy && (
        <EuiPortal>
          <EuiFlyout onClose={() => setIsPreviousVersionFlyoutOpen(false)} size="l" maxWidth={640}>
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id="FleetPackagePolicyPreviousVersionFlyoutTitle">
                  <FormattedMessage
                    id="xpack.fleet.upgradePackagePolicy.previousVersionFlyout.title"
                    defaultMessage="'{name}' integration policy"
                    values={{ name: currentPackagePolicy?.name }}
                  />
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <FlyoutBody>
              <EuiCodeBlock isCopyable fontSize="m" whiteSpace="pre">
                {JSON.stringify(dryRunData[0].agent_diff?.[0] || [], null, 2)}
              </EuiCodeBlock>
            </FlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      )}

      {isReadyForUpgrade && currentPackagePolicy ? (
        <EuiCallOut
          title={i18n.translate('xpack.fleet.upgradePackagePolicy.statusCallOut.successTitle', {
            defaultMessage: 'Ready to upgrade',
          })}
          color="success"
          iconType="checkInCircleFilled"
        >
          <FormattedMessage
            id="xpack.fleet.upgradePackagePolicy.statusCallout.successContent"
            defaultMessage="This integration is ready to be upgraded from version {currentVersion} to {upgradeVersion}. Review the changes below and save to upgrade."
            values={{
              currentVersion: currentPackagePolicy?.package?.version,
              upgradeVersion: proposedUpgradePackagePolicy?.package?.version,
            }}
          />
        </EuiCallOut>
      ) : (
        <EuiCallOut
          title={i18n.translate('xpack.fleet.upgradePackagePolicy.statusCallOut.errorTitle', {
            defaultMessage: 'Review field conflicts',
          })}
          color="warning"
          iconType="alert"
        >
          <FormattedMessage
            id="xpack.fleet.upgradePackagePolicy.statusCallout.errorContent"
            defaultMessage="This integration has conflicting fields from version {currentVersion} to {upgradeVersion} Review the configuration and save to perform the upgrade. You may reference your {previousConfigurationLink} for comparison."
            values={{
              currentVersion: currentPackagePolicy?.package?.version,
              upgradeVersion: proposedUpgradePackagePolicy?.package?.version,
              previousConfigurationLink: (
                <EuiLink onClick={() => setIsPreviousVersionFlyoutOpen(true)}>
                  <FormattedMessage
                    id="xpack.fleet.upgradePackagePolicy.statusCallout.previousConfigurationLink"
                    defaultMessage="previous configuration"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      )}
    </>
  );
};

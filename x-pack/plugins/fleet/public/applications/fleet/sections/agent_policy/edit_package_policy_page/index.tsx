/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { omit } from 'lodash';
import { useParams, useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiErrorBoundary,
} from '@elastic/eui';

import type { PackageInfo } from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  useStartServices,
  useConfig,
  useUIExtension,
  sendGetAgentStatus,
  useAuthz,
} from '../../../hooks';
import {
  useBreadcrumbs as useIntegrationsBreadcrumbs,
  useGetOnePackagePolicy,
} from '../../../../integrations/hooks';
import {
  Loading,
  Error,
  ExtensionWrapper,
  EuiButtonWithTooltip,
  DevtoolsRequestFlyoutButton,
} from '../../../components';
import { ConfirmDeployAgentPolicyModal } from '../components';
import { CreatePackagePolicySinglePageLayout } from '../create_package_policy_page/single_page_layout/components';
import type { AddToPolicyParams, EditPackagePolicyFrom } from '../create_package_policy_page/types';
import {
  StepConfigurePackagePolicy,
  StepDefinePackagePolicy,
} from '../create_package_policy_page/components';

import { HIDDEN_API_REFERENCE_PACKAGES } from '../../../../../../common/constants';
import type { PackagePolicyEditExtensionComponentProps } from '../../../types';
import { ExperimentalFeaturesService, pkgKeyFromPackageInfo } from '../../../services';
import { generateUpdatePackagePolicyDevToolsRequest } from '../services';

import { useHistoryBlock } from './hooks';
import { UpgradeStatusCallout } from './components';
import { usePackagePolicyWithRelatedData } from './hooks/use_package_policy';

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
  const params = useParams<AddToPolicyParams>();
  const { application, notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const { getHref } = useLink();

  const [] = useState<PackageInfo>();
  const {
    // data
    agentPolicy,
    isLoadingData,
    loadingError,
    packagePolicy,
    originalPackagePolicy,
    packageInfo,
    upgradeDryRunData,
    // form
    formState,
    setFormState,
    isUpgrade,
    isEdited,
    setIsEdited,
    savePackagePolicy,
    hasErrors,
    updatePackagePolicy,
    validationResults,
  } = usePackagePolicyWithRelatedData(packagePolicyId, {
    forceUpgrade,
  });

  const integrationInfo = useMemo(
    () =>
      packageInfo?.policy_templates?.find(
        (policyTemplate) => policyTemplate.name === params.integration
      ),
    [packageInfo?.policy_templates, params]
  );

  const canWriteIntegrationPolicies = useAuthz().integrations.writeIntegrationPolicies;

  const policyId = agentPolicy?.id ?? '';

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
    [updatePackagePolicy, setFormState]
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

  useHistoryBlock(isEdited);

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
      setIsEdited(false);
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
  const replaceDefineStepView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-policy-replace-define-step'
  );
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

  if (replaceDefineStepView && extensionView) {
    // eslint-disable-next-line no-console
    console.warn(
      "'package-policy-edit' is ignored when 'package-policy-replace-define-step' is defined"
    );
  }

  const configurePackage = useMemo(
    () =>
      agentPolicy && packageInfo ? (
        replaceDefineStepView && originalPackagePolicy ? (
          <ExtensionWrapper>
            <replaceDefineStepView.Component
              agentPolicy={agentPolicy}
              packageInfo={packageInfo}
              policy={originalPackagePolicy}
              newPolicy={packagePolicy}
              onChange={handleExtensionViewOnChange}
              validationResults={validationResults}
              integrationInfo={integrationInfo}
              isEditPage={true}
            />
          </ExtensionWrapper>
        ) : (
          <>
            {selectedTab === 0 && (
              <StepDefinePackagePolicy
                agentPolicy={agentPolicy}
                packageInfo={packageInfo}
                packagePolicy={packagePolicy}
                updatePackagePolicy={updatePackagePolicy}
                validationResults={validationResults!}
                submitAttempted={formState === 'INVALID'}
                isEditPage={true}
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
                isEditPage={true}
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
        )
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
      integrationInfo,
      replaceDefineStepView,
    ]
  );

  const { showDevtoolsRequest: isShowDevtoolRequestExperimentEnabled } =
    ExperimentalFeaturesService.get();

  const showDevtoolsRequest =
    !HIDDEN_API_REFERENCE_PACKAGES.includes(packageInfo?.name ?? '') &&
    isShowDevtoolRequestExperimentEnabled;

  const devtoolRequest = useMemo(
    () =>
      generateUpdatePackagePolicyDevToolsRequest(
        packagePolicyId,
        omit(packagePolicy, 'elasticsearch')
      ),
    [packagePolicyId, packagePolicy]
  );

  return (
    <CreatePackagePolicySinglePageLayout {...layoutProps} data-test-subj="editPackagePolicy">
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
            {isUpgrade && upgradeDryRunData && (
              <>
                <UpgradeStatusCallout dryRunData={upgradeDryRunData} />
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
                    {showDevtoolsRequest ? (
                      <EuiFlexItem grow={false}>
                        <DevtoolsRequestFlyoutButton
                          isDisabled={formState !== 'VALID'}
                          btnProps={{
                            color: 'ghost',
                          }}
                          description={i18n.translate(
                            'xpack.fleet.editPackagePolicy.devtoolsRequestDescription',
                            {
                              defaultMessage: 'This Kibana request updates a package policy.',
                            }
                          )}
                          request={devtoolRequest}
                        />
                      </EuiFlexItem>
                    ) : null}
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
    </CreatePackagePolicySinglePageLayout>
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

  if (from === 'package' || from === 'package-edit') {
    breadcrumb = (
      <IntegrationsBreadcrumb pkgkey={pkgkey} pkgTitle={pkgTitle} policyName={packagePolicyName} />
    );
  } else if (from === 'upgrade-from-integrations-policy-list') {
    breadcrumb = (
      <IntegrationsUpgradeBreadcrumb
        pkgkey={pkgkey}
        pkgTitle={pkgTitle}
        policyName={packagePolicyName}
      />
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

const IntegrationsUpgradeBreadcrumb = memo<{
  pkgTitle: string;
  policyName: string;
  pkgkey: string;
}>(({ pkgTitle, policyName, pkgkey }) => {
  useIntegrationsBreadcrumbs('integration_policy_upgrade', { policyName, pkgTitle, pkgkey });
  return null;
});

const UpgradeBreadcrumb: React.FunctionComponent<{
  policyName: string;
  policyId: string;
}> = ({ policyName, policyId }) => {
  useBreadcrumbs('upgrade_package_policy', { policyName, policyId });
  return null;
};

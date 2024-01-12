/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import {
  getNumTransformAssets,
  TransformInstallWithCurrentUserPermissionCallout,
} from '../../../../../../components/transform_install_as_current_user_callout';

import { useCancelAddPackagePolicy } from '../hooks';

import { isRootPrivilegesRequired, splitPkgKey } from '../../../../../../../common/services';
import type { NewAgentPolicy, PackagePolicyEditExtensionComponentProps } from '../../../../types';
import { SetupTechnology } from '../../../../types';
import {
  sendGetAgentStatus,
  useConfig,
  useGetPackageInfoByKeyQuery,
  useUIExtension,
} from '../../../../hooks';
import {
  DevtoolsRequestFlyoutButton,
  Error as ErrorComponent,
  ExtensionWrapper,
  Loading,
} from '../../../../components';

import { agentPolicyFormValidation, ConfirmDeployAgentPolicyModal } from '../../components';
import { pkgKeyFromPackageInfo } from '../../../../services';

import type { AddToPolicyParams, CreatePackagePolicyParams } from '../types';

import {
  IntegrationBreadcrumb,
  SelectedPolicyTab,
  StepConfigurePackagePolicy,
  StepDefinePackagePolicy,
  StepSelectHosts,
} from '../components';

import { generateNewAgentPolicyWithDefaults } from '../../../../../../../common/services/generate_new_agent_policy';

import { CreatePackagePolicySinglePageLayout, PostInstallAddAgentModal } from './components';
import { useDevToolsRequest, useOnSubmit, useSetupTechnology } from './hooks';
import { PostInstallCloudFormationModal } from './components/cloud_security_posture/post_install_cloud_formation_modal';
import { PostInstallGoogleCloudShellModal } from './components/cloud_security_posture/post_install_google_cloud_shell_modal';
import { PostInstallAzureArmTemplateModal } from './components/cloud_security_posture/post_install_azure_arm_template_modal';

const StepsWithLessPadding = styled(EuiSteps)`
  .euiStep__content {
    padding-bottom: ${(props) => props.theme.eui.euiSizeM};
  }

  // compensating for EuiBottomBar hiding the content
  @media (max-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    margin-bottom: 100px;
  }
`;

const CustomEuiBottomBar = styled(EuiBottomBar)`
  /* A relatively _low_ z-index value here to account for EuiComboBox popover that might appear under the bottom bar */
  z-index: 50;
`;

export const CreatePackagePolicySinglePage: CreatePackagePolicyParams = ({
  from,
  queryParamsPolicyId,
  prerelease,
}) => {
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const { params } = useRouteMatch<AddToPolicyParams>();

  const [newAgentPolicy, setNewAgentPolicy] = useState<NewAgentPolicy>(
    generateNewAgentPolicyWithDefaults({ name: 'Agent policy 1' })
  );

  const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);
  const validation = agentPolicyFormValidation(newAgentPolicy);

  const [selectedPolicyTab, setSelectedPolicyTab] = useState<SelectedPolicyTab>(
    queryParamsPolicyId ? SelectedPolicyTab.EXISTING : SelectedPolicyTab.NEW
  );

  const { pkgName, pkgVersion } = splitPkgKey(params.pkgkey);
  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKeyQuery(pkgName, pkgVersion, { full: true, prerelease });
  const packageInfo = useMemo(() => {
    if (packageInfoData && packageInfoData.item) {
      return packageInfoData.item;
    }
  }, [packageInfoData]);

  const [agentCount, setAgentCount] = useState<number>(0);

  const integrationInfo = useMemo(
    () =>
      (params as AddToPolicyParams).integration
        ? packageInfo?.policy_templates?.find(
            (policyTemplate) => policyTemplate.name === (params as AddToPolicyParams).integration
          )
        : undefined,
    [packageInfo?.policy_templates, params]
  );

  // Save package policy
  const {
    onSubmit,
    updatePackagePolicy,
    packagePolicy,
    agentPolicy,
    updateAgentPolicy,
    savedPackagePolicy,
    formState,
    setFormState,
    navigateAddAgent,
    navigateAddAgentHelp,
    setHasAgentPolicyError,
    validationResults,
    hasAgentPolicyError,
    isInitialized,
  } = useOnSubmit({
    agentCount,
    packageInfo,
    newAgentPolicy,
    selectedPolicyTab,
    withSysMonitoring,
    queryParamsPolicyId,
    integrationToEnable: integrationInfo?.name,
  });

  const setPolicyValidation = useCallback(
    (selectedTab: SelectedPolicyTab, updatedAgentPolicy: NewAgentPolicy) => {
      if (selectedTab === SelectedPolicyTab.NEW) {
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

  const updateSelectedPolicyTab = useCallback(
    (selectedTab) => {
      setSelectedPolicyTab(selectedTab);
      setPolicyValidation(selectedTab, newAgentPolicy);
    },
    [setSelectedPolicyTab, setPolicyValidation, newAgentPolicy]
  );

  // Retrieve agent count
  const agentPolicyId = agentPolicy?.id;

  const { cancelClickHandler, cancelUrl } = useCancelAddPackagePolicy({
    from,
    pkgkey: params.pkgkey,
    agentPolicyId,
  });
  useEffect(() => {
    const getAgentCount = async () => {
      const { data } = await sendGetAgentStatus({ policyId: agentPolicyId });
      if (data?.results.total !== undefined) {
        setAgentCount(data.results.total);
      }
    };

    if (isFleetEnabled && agentPolicyId) {
      getAgentCount();
    }
  }, [agentPolicyId, isFleetEnabled]);

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

  const { devtoolRequest, devtoolRequestDescription, showDevtoolsRequest } = useDevToolsRequest({
    newAgentPolicy,
    packagePolicy,
    selectedPolicyTab,
    withSysMonitoring,
    packageInfo,
  });

  const layoutProps = useMemo(
    () => ({
      from,
      cancelUrl,
      onCancel: cancelClickHandler,
      agentPolicy,
      packageInfo,
      integrationInfo,
    }),
    [agentPolicy, cancelClickHandler, cancelUrl, from, integrationInfo, packageInfo]
  );

  const stepSelectAgentPolicy = useMemo(
    () => (
      <StepSelectHosts
        agentPolicy={agentPolicy}
        updateAgentPolicy={updateAgentPolicy}
        newAgentPolicy={newAgentPolicy}
        updateNewAgentPolicy={updateNewAgentPolicy}
        withSysMonitoring={withSysMonitoring}
        updateSysMonitoring={(newValue) => setWithSysMonitoring(newValue)}
        validation={validation}
        packageInfo={packageInfo}
        setHasAgentPolicyError={setHasAgentPolicyError}
        updateSelectedTab={updateSelectedPolicyTab}
        selectedAgentPolicyId={queryParamsPolicyId}
      />
    ),
    [
      packageInfo,
      agentPolicy,
      updateAgentPolicy,
      newAgentPolicy,
      updateNewAgentPolicy,
      validation,
      withSysMonitoring,
      updateSelectedPolicyTab,
      queryParamsPolicyId,
      setHasAgentPolicyError,
    ]
  );

  const numTransformAssets = useMemo(
    () => getNumTransformAssets(packageInfo?.assets),
    [packageInfo?.assets]
  );

  const extensionView = useUIExtension(packagePolicy.package?.name ?? '', 'package-policy-create');
  const replaceDefineStepView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-policy-replace-define-step'
  );

  if (replaceDefineStepView && extensionView) {
    throw new Error(
      "'package-policy-create' and 'package-policy-replace-define-step' cannot both be registered as UI extensions"
    );
  }

  const { agentlessPolicy, handleSetupTechnologyChange, selectedSetupTechnology } =
    useSetupTechnology({
      newAgentPolicy,
      updateNewAgentPolicy,
      updateAgentPolicy,
      setSelectedPolicyTab,
    });

  const replaceStepConfigurePackagePolicy =
    replaceDefineStepView && packageInfo?.name ? (
      !isInitialized ? (
        <Loading />
      ) : (
        <ExtensionWrapper>
          <replaceDefineStepView.Component
            agentPolicy={agentPolicy}
            packageInfo={packageInfo}
            newPolicy={packagePolicy}
            onChange={handleExtensionViewOnChange}
            validationResults={validationResults}
            isEditPage={false}
            handleSetupTechnologyChange={handleSetupTechnologyChange}
            agentlessPolicy={agentlessPolicy}
          />
        </ExtensionWrapper>
      )
    ) : undefined;

  const stepConfigurePackagePolicy = useMemo(
    () =>
      isPackageInfoLoading || !isInitialized ? (
        <Loading />
      ) : packageInfo ? (
        <>
          <StepDefinePackagePolicy
            agentPolicy={agentPolicy}
            packageInfo={packageInfo}
            packagePolicy={packagePolicy}
            updatePackagePolicy={updatePackagePolicy}
            validationResults={validationResults}
            submitAttempted={formState === 'INVALID'}
          />

          {/* Only show the out-of-box configuration step if a UI extension is NOT registered */}
          {!extensionView && (
            <StepConfigurePackagePolicy
              packageInfo={packageInfo}
              showOnlyIntegration={integrationInfo?.name}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults}
              submitAttempted={formState === 'INVALID'}
            />
          )}

          {/* If a package has been loaded, then show UI extension (if any) */}
          {extensionView && packagePolicy.package?.name && (
            <ExtensionWrapper>
              <extensionView.Component
                newPolicy={packagePolicy}
                onChange={handleExtensionViewOnChange}
              />
            </ExtensionWrapper>
          )}
        </>
      ) : (
        <div />
      ),
    [
      isInitialized,
      isPackageInfoLoading,
      agentPolicy,
      packageInfo,
      packagePolicy,
      updatePackagePolicy,
      validationResults,
      formState,
      integrationInfo?.name,
      extensionView,
      handleExtensionViewOnChange,
    ]
  );

  const steps: EuiStepProps[] = [
    {
      title: i18n.translate('xpack.fleet.createPackagePolicy.stepConfigurePackagePolicyTitle', {
        defaultMessage: 'Configure integration',
      }),
      'data-test-subj': 'dataCollectionSetupStep',
      children: replaceStepConfigurePackagePolicy || stepConfigurePackagePolicy,
    },
  ];

  if (selectedSetupTechnology !== SetupTechnology.AGENTLESS) {
    steps.push({
      title: i18n.translate('xpack.fleet.createPackagePolicy.stepSelectAgentPolicyTitle', {
        defaultMessage: 'Where to add this integration?',
      }),
      children: stepSelectAgentPolicy,
    });
  }

  // Display package error if there is one
  if (packageInfoError) {
    return (
      <ErrorComponent
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.errorLoadingPackageTitle"
            defaultMessage="Error loading package information"
          />
        }
        error={packageInfoError}
      />
    );
  }
  return (
    <CreatePackagePolicySinglePageLayout {...layoutProps} data-test-subj="createPackagePolicy">
      <EuiErrorBoundary>
        {formState === 'CONFIRM' && agentPolicy && (
          <ConfirmDeployAgentPolicyModal
            agentCount={agentCount}
            agentPolicy={agentPolicy}
            onConfirm={onSubmit}
            onCancel={() => setFormState('VALID')}
          />
        )}
        {formState === 'SUBMITTED_NO_AGENTS' &&
          agentPolicy &&
          packageInfo &&
          savedPackagePolicy && (
            <PostInstallAddAgentModal
              packageInfo={packageInfo}
              onConfirm={() => navigateAddAgent(savedPackagePolicy)}
              onCancel={() => navigateAddAgentHelp(savedPackagePolicy)}
            />
          )}
        {formState === 'SUBMITTED_AZURE_ARM_TEMPLATE' && agentPolicy && savedPackagePolicy && (
          <PostInstallAzureArmTemplateModal
            agentPolicy={agentPolicy}
            packagePolicy={savedPackagePolicy}
            onConfirm={() => navigateAddAgent(savedPackagePolicy)}
            onCancel={() => navigateAddAgentHelp(savedPackagePolicy)}
          />
        )}
        {formState === 'SUBMITTED_CLOUD_FORMATION' && agentPolicy && savedPackagePolicy && (
          <PostInstallCloudFormationModal
            agentPolicy={agentPolicy}
            packagePolicy={savedPackagePolicy}
            onConfirm={() => navigateAddAgent(savedPackagePolicy)}
            onCancel={() => navigateAddAgentHelp(savedPackagePolicy)}
          />
        )}
        {formState === 'SUBMITTED_GOOGLE_CLOUD_SHELL' && agentPolicy && savedPackagePolicy && (
          <PostInstallGoogleCloudShellModal
            agentPolicy={agentPolicy}
            packagePolicy={savedPackagePolicy}
            onConfirm={() => navigateAddAgent(savedPackagePolicy)}
            onCancel={() => navigateAddAgentHelp(savedPackagePolicy)}
          />
        )}
        {packageInfo && (
          <IntegrationBreadcrumb
            pkgTitle={integrationInfo?.title || packageInfo.title}
            pkgkey={pkgKeyFromPackageInfo(packageInfo)}
            integration={integrationInfo?.name}
          />
        )}
        {packageInfo && isRootPrivilegesRequired(packageInfo) ? (
          <>
            <EuiCallOut
              size="s"
              color="warning"
              title={
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.requireRootCalloutTitle"
                  defaultMessage="Requires root privileges"
                />
              }
            >
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.requireRootCalloutDescription"
                defaultMessage="Elastic Agent needs to be run with root/administrator privileges for this integration."
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        {numTransformAssets > 0 ? (
          <>
            <TransformInstallWithCurrentUserPermissionCallout count={numTransformAssets} />
            <EuiSpacer size="xl" />
          </>
        ) : null}
        <StepsWithLessPadding steps={steps} />
        <EuiSpacer size="xl" />
        <EuiSpacer size="xl" />
        <CustomEuiBottomBar data-test-subj="integrationsBottomBar">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              {packageInfo && (formState === 'INVALID' || hasAgentPolicyError) ? (
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.errorOnSaveText"
                  defaultMessage="Your integration policy has errors. Please fix them before saving."
                />
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                  <EuiButtonEmpty
                    color="text"
                    href={cancelUrl}
                    onClick={cancelClickHandler}
                    data-test-subj="createPackagePolicyCancelButton"
                  >
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.cancelButton"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {showDevtoolsRequest ? (
                  <EuiFlexItem grow={false}>
                    <DevtoolsRequestFlyoutButton
                      request={devtoolRequest}
                      description={devtoolRequestDescription}
                      btnProps={{
                        color: 'text',
                      }}
                    />
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => onSubmit()}
                    isLoading={formState === 'LOADING'}
                    disabled={formState !== 'VALID' || hasAgentPolicyError || !validationResults}
                    iconType="save"
                    color="primary"
                    fill
                    data-test-subj="createPackagePolicySaveButton"
                  >
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.saveButton"
                      defaultMessage="Save and continue"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </CustomEuiBottomBar>
      </EuiErrorBoundary>
    </CreatePackagePolicySinglePageLayout>
  );
};

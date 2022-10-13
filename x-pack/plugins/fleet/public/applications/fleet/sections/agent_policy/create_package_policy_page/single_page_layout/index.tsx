/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiSteps,
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiErrorBoundary,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import { safeLoad } from 'js-yaml';

import { useCancelAddPackagePolicy, useOnSaveNavigate } from '../hooks';
import type { CreatePackagePolicyRequest } from '../../../../../../../common/types';

import { splitPkgKey } from '../../../../../../../common/services';
import {
  dataTypes,
  FLEET_SYSTEM_PACKAGE,
  HIDDEN_API_REFERENCE_PACKAGES,
} from '../../../../../../../common/constants';
import { useConfirmForceInstall } from '../../../../../integrations/hooks';
import type {
  AgentPolicy,
  NewAgentPolicy,
  NewPackagePolicy,
  PackagePolicy,
} from '../../../../types';
import {
  sendCreatePackagePolicy,
  useStartServices,
  useConfig,
  sendGetAgentStatus,
  useGetPackageInfoByKey,
  sendCreateAgentPolicy,
} from '../../../../hooks';
import {
  Loading,
  Error,
  ExtensionWrapper,
  DevtoolsRequestFlyoutButton,
} from '../../../../components';

import { agentPolicyFormValidation, ConfirmDeployAgentPolicyModal } from '../../components';
import { useUIExtension } from '../../../../hooks';
import type { PackagePolicyEditExtensionComponentProps } from '../../../../types';
import {
  pkgKeyFromPackageInfo,
  isVerificationError,
  ExperimentalFeaturesService,
} from '../../../../services';

import type {
  PackagePolicyFormState,
  AddToPolicyParams,
  CreatePackagePolicyParams,
} from '../types';

import { IntegrationBreadcrumb } from '../components';

import type { PackagePolicyValidationResults } from '../services';
import { validatePackagePolicy, validationHasErrors } from '../services';
import {
  StepConfigurePackagePolicy,
  StepDefinePackagePolicy,
  SelectedPolicyTab,
  StepSelectHosts,
} from '../components';
import {
  generateCreatePackagePolicyDevToolsRequest,
  generateCreateAgentPolicyDevToolsRequest,
} from '../../services';

import { CreatePackagePolicySinglePageLayout, PostInstallAddAgentModal } from './components';

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
}) => {
  const { notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const { params } = useRouteMatch<AddToPolicyParams>();
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy | undefined>();

  const [newAgentPolicy, setNewAgentPolicy] = useState<NewAgentPolicy>({
    name: 'Agent policy 1',
    description: '',
    namespace: 'default',
    monitoring_enabled: Object.values(dataTypes),
  });

  const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);
  const validation = agentPolicyFormValidation(newAgentPolicy);

  // only used to store the resulting package policy once saved
  const [savedPackagePolicy, setSavedPackagePolicy] = useState<PackagePolicy>();

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
  const [agentCount, setAgentCount] = useState<number>(0);

  const [selectedPolicyTab, setSelectedPolicyTab] = useState<SelectedPolicyTab>(
    queryParamsPolicyId ? SelectedPolicyTab.EXISTING : SelectedPolicyTab.NEW
  );

  // New package policy state
  const [packagePolicy, setPackagePolicy] = useState<NewPackagePolicy>({
    name: '',
    description: '',
    namespace: 'default',
    policy_id: '',
    enabled: true,
    inputs: [],
  });

  const onSaveNavigate = useOnSaveNavigate({
    packagePolicy,
    queryParamsPolicyId,
  });
  const navigateAddAgent = (policy?: PackagePolicy) =>
    onSaveNavigate(policy, ['openEnrollmentFlyout']);

  const navigateAddAgentHelp = (policy?: PackagePolicy) =>
    onSaveNavigate(policy, ['showAddAgentHelp']);

  const confirmForceInstall = useConfirmForceInstall();

  // Validation state
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const [hasAgentPolicyError, setHasAgentPolicyError] = useState<boolean>(false);

  // Form state
  const [formState, setFormState] = useState<PackagePolicyFormState>('VALID');

  const { pkgName, pkgVersion } = splitPkgKey(params.pkgkey);
  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKey(pkgName, pkgVersion);
  const packageInfo = useMemo(() => {
    if (packageInfoData && packageInfoData.item) {
      return packageInfoData.item;
    }
  }, [packageInfoData]);

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

  const setPolicyValidation = (
    selectedTab: SelectedPolicyTab,
    updatedAgentPolicy: NewAgentPolicy
  ) => {
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
  };

  const updateNewAgentPolicy = useCallback(
    (updatedFields: Partial<NewAgentPolicy>) => {
      const updatedAgentPolicy = {
        ...newAgentPolicy,
        ...updatedFields,
      };
      setNewAgentPolicy(updatedAgentPolicy);
      setPolicyValidation(selectedPolicyTab, updatedAgentPolicy);
    },
    [setNewAgentPolicy, newAgentPolicy, selectedPolicyTab]
  );

  const updateSelectedPolicyTab = useCallback(
    (selectedTab) => {
      setSelectedPolicyTab(selectedTab);
      setPolicyValidation(selectedTab, newAgentPolicy);
    },
    [setSelectedPolicyTab, newAgentPolicy]
  );

  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;
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
    [packagePolicy, updatePackagePolicyValidation, selectedPolicyTab]
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

  // Save package policy
  const savePackagePolicy = useCallback(
    async (pkgPolicy: CreatePackagePolicyRequest['body']) => {
      setFormState('LOADING');
      const result = await sendCreatePackagePolicy(pkgPolicy);
      setFormState(agentCount ? 'SUBMITTED' : 'SUBMITTED_NO_AGENTS');
      return result;
    },
    [agentCount]
  );

  const createAgentPolicy = useCallback(async (): Promise<AgentPolicy | undefined> => {
    let createdAgentPolicy;
    setFormState('LOADING');
    // do not create agent policy with system integration if package policy already is for system package
    const packagePolicyIsSystem = packagePolicy?.package?.name === FLEET_SYSTEM_PACKAGE;
    const resp = await sendCreateAgentPolicy(newAgentPolicy, {
      withSysMonitoring: withSysMonitoring && !packagePolicyIsSystem,
    });
    if (resp.error) {
      setFormState('VALID');
      throw resp.error;
    }
    if (resp.data) {
      createdAgentPolicy = resp.data.item;
      setAgentPolicy(createdAgentPolicy);
      updatePackagePolicy({ policy_id: createdAgentPolicy.id });
    }
    return createdAgentPolicy;
  }, [packagePolicy?.package?.name, newAgentPolicy, withSysMonitoring, updatePackagePolicy]);

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
          createdPolicy = await createAgentPolicy();
        } catch (e) {
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
      savePackagePolicy,
      packagePolicy,
      createAgentPolicy,
      notifications.toasts,
      agentPolicy,
      onSaveNavigate,
      confirmForceInstall,
    ]
  );

  const integrationInfo = useMemo(
    () =>
      (params as AddToPolicyParams).integration
        ? packageInfo?.policy_templates?.find(
            (policyTemplate) => policyTemplate.name === (params as AddToPolicyParams).integration
          )
        : undefined,
    [packageInfo?.policy_templates, params]
  );

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
    ]
  );

  const extensionView = useUIExtension(packagePolicy.package?.name ?? '', 'package-policy-create');

  const stepConfigurePackagePolicy = useMemo(
    () =>
      isPackageInfoLoading ? (
        <Loading />
      ) : packageInfo ? (
        <>
          <StepDefinePackagePolicy
            agentPolicy={agentPolicy}
            packageInfo={packageInfo}
            packagePolicy={packagePolicy}
            updatePackagePolicy={updatePackagePolicy}
            validationResults={validationResults!}
            submitAttempted={formState === 'INVALID'}
            integrationToEnable={integrationInfo?.name}
          />

          {/* Only show the out-of-box configuration step if a UI extension is NOT registered */}
          {!extensionView && (
            <StepConfigurePackagePolicy
              packageInfo={packageInfo}
              showOnlyIntegration={integrationInfo?.name}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults!}
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
      children: stepConfigurePackagePolicy,
    },
    {
      title: i18n.translate('xpack.fleet.createPackagePolicy.stepSelectAgentPolicyTitle', {
        defaultMessage: 'Where to add this integration?',
      }),
      children: stepSelectAgentPolicy,
    },
  ];

  const { showDevtoolsRequest: isShowDevtoolRequestExperimentEnabled } =
    ExperimentalFeaturesService.get();

  const showDevtoolsRequest =
    !HIDDEN_API_REFERENCE_PACKAGES.includes(packageInfo?.name ?? '') &&
    isShowDevtoolRequestExperimentEnabled;

  const [devtoolRequest, devtoolRequestDescription] = useMemo(() => {
    if (selectedPolicyTab === SelectedPolicyTab.NEW) {
      const packagePolicyIsSystem = packagePolicy?.package?.name === FLEET_SYSTEM_PACKAGE;
      return [
        `${generateCreateAgentPolicyDevToolsRequest(
          newAgentPolicy,
          withSysMonitoring && !packagePolicyIsSystem
        )}\n\n${generateCreatePackagePolicyDevToolsRequest({
          ...packagePolicy,
        })}`,
        i18n.translate(
          'xpack.fleet.createPackagePolicy.devtoolsRequestWithAgentPolicyDescription',
          {
            defaultMessage:
              'These Kibana requests create a new agent policy and a new package policy.',
          }
        ),
      ];
    }

    return [
      generateCreatePackagePolicyDevToolsRequest({
        ...packagePolicy,
      }),
      i18n.translate('xpack.fleet.createPackagePolicy.devtoolsRequestDescription', {
        defaultMessage: 'This Kibana request creates a new package policy.',
      }),
    ];
  }, [packagePolicy, newAgentPolicy, withSysMonitoring, selectedPolicyTab]);

  // Display package error if there is one
  if (packageInfoError) {
    return (
      <Error
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
        {formState === 'SUBMITTED_NO_AGENTS' && agentPolicy && packageInfo && (
          <PostInstallAddAgentModal
            packageInfo={packageInfo}
            agentPolicy={agentPolicy}
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
                    color="ghost"
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
                        color: 'ghost',
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

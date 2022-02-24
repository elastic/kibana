/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactEventHandler } from 'react';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouteMatch, useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
import type { ApplicationStart } from 'kibana/public';
import { safeLoad } from 'js-yaml';

import type {
  AgentPolicy,
  NewPackagePolicy,
  PackagePolicy,
  CreatePackagePolicyRouteState,
  OnSaveQueryParamKeys,
} from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  sendCreatePackagePolicy,
  useStartServices,
  useConfig,
  sendGetAgentStatus,
  useGetPackageInfoByKey,
} from '../../../hooks';
import { Loading, Error } from '../../../components';
import { ConfirmDeployAgentPolicyModal } from '../components';
import { useIntraAppState, useUIExtension } from '../../../hooks';
import { ExtensionWrapper } from '../../../components';
import type { PackagePolicyEditExtensionComponentProps } from '../../../types';
import { PLUGIN_ID } from '../../../../../../common/constants';
import { pkgKeyFromPackageInfo } from '../../../services';

import { CreatePackagePolicyPageLayout, PostInstallAddAgentModal } from './components';
import type { EditPackagePolicyFrom, PackagePolicyFormState } from './types';
import type { PackagePolicyValidationResults } from './services';
import { validatePackagePolicy, validationHasErrors } from './services';
import { appendOnSaveQueryParamsToPath } from './utils';
import { StepSelectAgentPolicy } from './step_select_agent_policy';
import { StepConfigurePackagePolicy } from './step_configure_package';
import { StepDefinePackagePolicy } from './step_define_package_policy';

const StepsWithLessPadding = styled(EuiSteps)`
  .euiStep__content {
    padding-bottom: ${(props) => props.theme.eui.paddingSizes.m};
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

interface AddToPolicyParams {
  pkgkey: string;
  integration?: string;
  policyId?: string;
}

export const CreatePackagePolicyPage: React.FunctionComponent = () => {
  const { notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const { params } = useRouteMatch<AddToPolicyParams>();
  const { getHref, getPath } = useLink();
  const history = useHistory();
  const handleNavigateTo = useNavigateToCallback();
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();

  const { search } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const queryParamsPolicyId = useMemo(
    () => queryParams.get('policyId') ?? undefined,
    [queryParams]
  );

  /**
   * Please note: policyId can come from one of two sources. The URL param (in the URL path) or
   * in the query params (?policyId=foo).
   *
   * Either way, we take this as an indication that a user is "coming from" the fleet policy UI
   * since we link them out to packages (a.k.a. integrations) UI when choosing a new package. It is
   * no longer possible to choose a package directly in the create package form.
   *
   * We may want to deprecate the ability to pass in policyId from URL params since there is no package
   * creation possible if a user has not chosen one from the packages UI.
   */
  const from: EditPackagePolicyFrom =
    'policyId' in params || queryParamsPolicyId ? 'policy' : 'package';

  // Agent policy state
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy | undefined>();

  // only used to store the resulting package policy once saved
  const [savedPackagePolicy, setSavedPackagePolicy] = useState<PackagePolicy>();

  // Retrieve agent count
  const agentPolicyId = agentPolicy?.id;
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

  // New package policy state
  const [packagePolicy, setPackagePolicy] = useState<NewPackagePolicy>({
    name: '',
    description: '',
    namespace: '',
    policy_id: '',
    enabled: true,
    output_id: '', // TODO: Blank for now as we only support default output
    inputs: [],
  });

  const [wasNewAgentPolicyCreated, setWasNewAgentPolicyCreated] = useState<boolean>(false);

  // Validation state
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const [hasAgentPolicyError, setHasAgentPolicyError] = useState<boolean>(false);

  // Form state
  const [formState, setFormState] = useState<PackagePolicyFormState>('VALID');

  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKey(params.pkgkey);
  const packageInfo = useMemo(() => {
    if (packageInfoData && packageInfoData.response) {
      return packageInfoData.response;
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
      if (hasPackage && hasAgentPolicy && !hasValidationErrors) {
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

  // Cancel path
  const cancelUrl = useMemo(() => {
    if (routeState && routeState.onCancelUrl) {
      return routeState.onCancelUrl;
    }
    return from === 'policy' && agentPolicyId
      ? getHref('policy_details', {
          policyId: agentPolicyId,
        })
      : getHref('integration_details_overview', { pkgkey: params.pkgkey });
  }, [routeState, from, agentPolicyId, getHref, params.pkgkey]);

  const cancelClickHandler: ReactEventHandler = useCallback(
    (ev) => {
      if (routeState && routeState.onCancelNavigateTo) {
        ev.preventDefault();
        handleNavigateTo(routeState.onCancelNavigateTo);
      }
    },
    [routeState, handleNavigateTo]
  );

  // Save package policy
  const savePackagePolicy = useCallback(async () => {
    setFormState('LOADING');
    const result = await sendCreatePackagePolicy(packagePolicy);
    setFormState(agentCount ? 'SUBMITTED' : 'SUBMITTED_NO_AGENTS');
    return result;
  }, [packagePolicy, agentCount]);
  const doOnSaveNavigation = useRef<boolean>(true);

  const handleInlineAgentPolicyCreate = useCallback(() => {
    setWasNewAgentPolicyCreated(true);
  }, []);

  // Detect if user left page
  useEffect(() => {
    return () => {
      doOnSaveNavigation.current = false;
    };
  }, []);

  const navigateAddAgent = (policy?: PackagePolicy) =>
    onSaveNavigate(policy, ['openEnrollmentFlyout']);

  const navigateAddAgentHelp = (policy?: PackagePolicy) =>
    onSaveNavigate(policy, ['showAddAgentHelp']);

  const onSaveNavigate = useCallback(
    (policy?: PackagePolicy, paramsToApply: OnSaveQueryParamKeys[] = []) => {
      if (!doOnSaveNavigation.current) {
        return;
      }

      const packagePolicyPath = getPath('policy_details', { policyId: packagePolicy.policy_id });

      if (routeState?.onSaveNavigateTo && policy) {
        const [appId, options] = routeState.onSaveNavigateTo;

        if (options?.path) {
          const pathWithQueryString = appendOnSaveQueryParamsToPath({
            // In cases where we created a new agent policy inline, we need to override the initial `path`
            // value and navigate to the newly-created agent policy instead
            path: wasNewAgentPolicyCreated ? packagePolicyPath : options.path,
            policy,
            mappingOptions: routeState.onSaveQueryParams,
            paramsToApply,
          });
          handleNavigateTo([appId, { ...options, path: pathWithQueryString }]);
        } else {
          handleNavigateTo(routeState.onSaveNavigateTo);
        }
      } else {
        history.push(packagePolicyPath);
      }
    },
    [
      packagePolicy.policy_id,
      getPath,
      handleNavigateTo,
      history,
      routeState,
      wasNewAgentPolicyCreated,
    ]
  );

  const onSubmit = useCallback(async () => {
    if (formState === 'VALID' && hasErrors) {
      setFormState('INVALID');
      return;
    }
    if (agentCount !== 0 && formState !== 'CONFIRM') {
      setFormState('CONFIRM');
      return;
    }
    const { error, data } = await savePackagePolicy();
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
      notifications.toasts.addError(error, {
        title: 'Error',
      });
      setFormState('VALID');
    }
  }, [
    formState,
    hasErrors,
    agentCount,
    savePackagePolicy,
    onSaveNavigate,
    agentPolicy,
    notifications.toasts,
    packagePolicy.name,
  ]);

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
      <StepSelectAgentPolicy
        packageInfo={packageInfo}
        defaultAgentPolicyId={queryParamsPolicyId}
        agentPolicy={agentPolicy}
        updateAgentPolicy={updateAgentPolicy}
        setHasAgentPolicyError={setHasAgentPolicyError}
        onNewAgentPolicyCreate={handleInlineAgentPolicyCreate}
      />
    ),
    [
      packageInfo,
      queryParamsPolicyId,
      agentPolicy,
      updateAgentPolicy,
      handleInlineAgentPolicyCreate,
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
        defaultMessage: 'Apply to agent policy',
      }),
      children: stepSelectAgentPolicy,
    },
  ];

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
    <CreatePackagePolicyPageLayout {...layoutProps} data-test-subj="createPackagePolicy">
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
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={onSubmit}
                    isLoading={formState === 'LOADING'}
                    disabled={formState !== 'VALID' || hasAgentPolicyError}
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
    </CreatePackagePolicyPageLayout>
  );
};

const IntegrationBreadcrumb: React.FunctionComponent<{
  pkgTitle: string;
  pkgkey: string;
  integration?: string;
}> = ({ pkgTitle, pkgkey, integration }) => {
  useBreadcrumbs('add_integration_to_policy', {
    pkgTitle,
    pkgkey,
    ...(integration ? { integration } : {}),
  });
  return null;
};

const useNavigateToCallback = () => {
  const history = useHistory();
  const {
    application: { navigateToApp },
  } = useStartServices();

  return useCallback(
    (navigateToProps: Parameters<ApplicationStart['navigateToApp']>) => {
      // If navigateTo appID is `fleet`, then don't use Kibana's navigateTo method, because that
      // uses BrowserHistory but within fleet, we are using HashHistory.
      // This temporary workaround hook can be removed once this issue is addressed:
      // https://github.com/elastic/kibana/issues/70358
      if (navigateToProps[0] === PLUGIN_ID) {
        const { path = '', state } = navigateToProps[1] || {};
        history.push({
          pathname: path.charAt(0) === '#' ? path.substr(1) : path,
          state,
        });
      }

      return navigateToApp(...navigateToProps);
    },
    [history, navigateToApp]
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactEventHandler } from 'react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import type { ApplicationStart } from 'kibana/public';

import type {
  AgentPolicy,
  PackageInfo,
  NewPackagePolicy,
  CreatePackagePolicyRouteState,
} from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  sendCreatePackagePolicy,
  useStartServices,
  useConfig,
  sendGetAgentStatus,
} from '../../../hooks';
import { Loading } from '../../../components';
import { ConfirmDeployAgentPolicyModal } from '../components';
import { useIntraAppState, useUIExtension } from '../../../hooks';
import { ExtensionWrapper } from '../../../components';
import type { PackagePolicyEditExtensionComponentProps } from '../../../types';
import { PLUGIN_ID } from '../../../../../../common/constants';
import { pkgKeyFromPackageInfo } from '../../../services';

import { CreatePackagePolicyPageLayout } from './components';
import type { CreatePackagePolicyFrom, PackagePolicyFormState } from './types';
import type { PackagePolicyValidationResults } from './services';
import { validatePackagePolicy, validationHasErrors } from './services';
import { StepSelectAgentPolicy } from './step_select_agent_policy';
import { StepConfigurePackagePolicy } from './step_configure_package';
import { StepDefinePackagePolicy } from './step_define_package_policy';

const StepsWithLessPadding = styled(EuiSteps)`
  .euiStep__content {
    padding-bottom: ${(props) => props.theme.eui.paddingSizes.m};
  }
`;

const CustomEuiBottomBar = styled(EuiBottomBar)`
  // Set a relatively _low_ z-index value here to account for EuiComboBox popover that might appear under the bottom bar
  z-index: 50;
`;

interface AddToPolicyParams {
  pkgkey: string;
  integration?: string;
  policyId?: string;
}

interface AddFromPolicyParams {
  policyId: string;
}

export const CreatePackagePolicyPage: React.FunctionComponent = () => {
  const { notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const { params } = useRouteMatch<AddToPolicyParams | AddFromPolicyParams>();
  const { getHref, getPath } = useLink();
  const history = useHistory();
  const handleNavigateTo = useNavigateToCallback();
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const from: CreatePackagePolicyFrom = 'policyId' in params ? 'policy' : 'package';

  const { search } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const policyId = useMemo(() => queryParams.get('policyId') ?? undefined, [queryParams]);

  // Agent policy and package info states
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy | undefined>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [isLoadingAgentPolicyStep, setIsLoadingAgentPolicyStep] = useState<boolean>(false);

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

  // Package policy validation state
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();

  // Form state
  const [formState, setFormState] = useState<PackagePolicyFormState>('INVALID');

  // Update package info method
  const updatePackageInfo = useCallback(
    (updatedPackageInfo: PackageInfo | undefined) => {
      if (updatedPackageInfo) {
        setPackageInfo(updatedPackageInfo);
        if (agentPolicy) {
          setFormState('VALID');
        }
      } else {
        setFormState('INVALID');
        setPackageInfo(undefined);
      }

      // eslint-disable-next-line no-console
      console.debug('Package info updated', updatedPackageInfo);
    },
    [agentPolicy, setPackageInfo, setFormState]
  );

  // Update agent policy method
  const updateAgentPolicy = useCallback(
    (updatedAgentPolicy: AgentPolicy | undefined) => {
      if (updatedAgentPolicy) {
        setAgentPolicy(updatedAgentPolicy);
        if (packageInfo) {
          setFormState('VALID');
        }
      } else {
        setFormState('INVALID');
        setAgentPolicy(undefined);
      }

      // eslint-disable-next-line no-console
      console.debug('Agent policy updated', updatedAgentPolicy);
    },
    [packageInfo, setAgentPolicy, setFormState]
  );

  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Update package policy validation
  const updatePackagePolicyValidation = useCallback(
    (newPackagePolicy?: NewPackagePolicy) => {
      if (packageInfo) {
        const newValidationResult = validatePackagePolicy(
          newPackagePolicy || packagePolicy,
          packageInfo
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
    return from === 'policy'
      ? getHref('policy_details', {
          policyId: agentPolicyId || (params as AddFromPolicyParams).policyId,
        })
      : getHref('integration_details_overview', { pkgkey: (params as AddToPolicyParams).pkgkey });
  }, [agentPolicyId, params, from, getHref, routeState]);

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
    setFormState('SUBMITTED');
    return result;
  }, [packagePolicy]);

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
      if (routeState && routeState.onSaveNavigateTo) {
        handleNavigateTo(
          typeof routeState.onSaveNavigateTo === 'function'
            ? routeState.onSaveNavigateTo(data!.item)
            : routeState.onSaveNavigateTo
        );
      } else {
        history.push(
          getPath('policy_details', {
            policyId: agentPolicy?.id || (params as AddFromPolicyParams).policyId,
          })
        );
      }

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.createPackagePolicy.addedNotificationTitle', {
          defaultMessage: `'{packagePolicyName}' integration added.`,
          values: {
            packagePolicyName: packagePolicy.name,
          },
        }),
        text:
          agentCount && agentPolicy
            ? i18n.translate('xpack.fleet.createPackagePolicy.addedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentPolicyName}' policy.`,
                values: {
                  agentPolicyName: agentPolicy.name,
                },
              })
            : (params as AddToPolicyParams)?.policyId && agentPolicy && agentCount === 0
            ? i18n.translate('xpack.fleet.createPackagePolicy.addAgentNextNotification', {
                defaultMessage: `The policy has been updated. Add an agent to the '{agentPolicyName}' policy to deploy this policy.`,
                values: {
                  agentPolicyName: agentPolicy.name,
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
    agentCount,
    agentPolicy,
    formState,
    getPath,
    handleNavigateTo,
    hasErrors,
    history,
    notifications.toasts,
    packagePolicy.name,
    params,
    routeState,
    savePackagePolicy,
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
        pkgkey={(params as AddToPolicyParams).pkgkey}
        updatePackageInfo={updatePackageInfo}
        defaultAgentPolicyId={policyId}
        agentPolicy={agentPolicy}
        updateAgentPolicy={updateAgentPolicy}
        setIsLoadingSecondStep={setIsLoadingAgentPolicyStep}
      />
    ),
    [params, updatePackageInfo, agentPolicy, updateAgentPolicy, policyId]
  );

  const ExtensionView = useUIExtension(packagePolicy.package?.name ?? '', 'package-policy-create');

  const stepConfigurePackagePolicy = useMemo(
    () =>
      isLoadingAgentPolicyStep ? (
        <Loading />
      ) : agentPolicy && packageInfo ? (
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
          {!ExtensionView && (
            <StepConfigurePackagePolicy
              packageInfo={packageInfo}
              showOnlyIntegration={integrationInfo?.name}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults!}
              submitAttempted={formState === 'INVALID'}
            />
          )}

          {/* If an Agent Policy and a package has been selected, then show UI extension (if any) */}
          {ExtensionView && packagePolicy.policy_id && packagePolicy.package?.name && (
            <ExtensionWrapper>
              <ExtensionView newPolicy={packagePolicy} onChange={handleExtensionViewOnChange} />
            </ExtensionWrapper>
          )}
        </>
      ) : (
        <div />
      ),
    [
      isLoadingAgentPolicyStep,
      agentPolicy,
      packageInfo,
      packagePolicy,
      updatePackagePolicy,
      validationResults,
      formState,
      integrationInfo?.name,
      ExtensionView,
      handleExtensionViewOnChange,
    ]
  );

  const steps: EuiStepProps[] = [
    {
      title: i18n.translate('xpack.fleet.createPackagePolicy.stepConfigurePackagePolicyTitle', {
        defaultMessage: 'Configure integration',
      }),
      status: !packageInfo || !agentPolicy || isLoadingAgentPolicyStep ? 'disabled' : undefined,
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

  return (
    <CreatePackagePolicyPageLayout {...layoutProps} data-test-subj="createPackagePolicy">
      {formState === 'CONFIRM' && agentPolicy && (
        <ConfirmDeployAgentPolicyModal
          agentCount={agentCount}
          agentPolicy={agentPolicy}
          onConfirm={onSubmit}
          onCancel={() => setFormState('VALID')}
        />
      )}
      {from === 'package'
        ? packageInfo && (
            <IntegrationBreadcrumb
              pkgTitle={integrationInfo?.title || packageInfo.title}
              pkgkey={pkgKeyFromPackageInfo(packageInfo)}
              integration={integrationInfo?.name}
            />
          )
        : agentPolicy && (
            <PolicyBreadcrumb policyName={agentPolicy.name} policyId={agentPolicy.id} />
          )}
      <StepsWithLessPadding steps={steps} />
      <EuiSpacer size="l" />
      <CustomEuiBottomBar data-test-subj="integrationsBottomBar">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            {!isLoadingAgentPolicyStep && agentPolicy && packageInfo && formState === 'INVALID' ? (
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
                  disabled={formState !== 'VALID'}
                  iconType="save"
                  color="primary"
                  fill
                  data-test-subj="createPackagePolicySaveButton"
                >
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.saveButton"
                    defaultMessage="Save integration"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </CustomEuiBottomBar>
    </CreatePackagePolicyPageLayout>
  );
};

const PolicyBreadcrumb: React.FunctionComponent<{
  policyName: string;
  policyId: string;
}> = ({ policyName, policyId }) => {
  useBreadcrumbs('add_integration_from_policy', { policyName, policyId });
  return null;
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

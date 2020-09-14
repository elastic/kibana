/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect, useMemo, useCallback, ReactEventHandler } from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
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
import { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import {
  AgentPolicy,
  PackageInfo,
  NewPackagePolicy,
  CreatePackagePolicyRouteState,
} from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  sendCreatePackagePolicy,
  useCore,
  useConfig,
  sendGetAgentStatus,
} from '../../../hooks';
import { Loading } from '../../../components';
import { ConfirmDeployAgentPolicyModal } from '../components';
import { CreatePackagePolicyPageLayout } from './components';
import { CreatePackagePolicyFrom, PackagePolicyFormState } from './types';
import {
  PackagePolicyValidationResults,
  validatePackagePolicy,
  validationHasErrors,
} from './services';
import { StepSelectPackage } from './step_select_package';
import { StepSelectAgentPolicy } from './step_select_agent_policy';
import { StepConfigurePackagePolicy } from './step_configure_package';
import { StepDefinePackagePolicy } from './step_define_package_policy';
import { useIntraAppState } from '../../../hooks/use_intra_app_state';

const StepsWithLessPadding = styled(EuiSteps)`
  .euiStep__content {
    padding-bottom: ${(props) => props.theme.eui.paddingSizes.m};
  }
`;

export const CreatePackagePolicyPage: React.FunctionComponent = () => {
  const {
    notifications,
    chrome: { getIsNavDrawerLocked$ },
    uiSettings,
    application: { navigateToApp },
  } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const {
    params: { policyId, pkgkey },
  } = useRouteMatch<{ policyId: string; pkgkey: string }>();
  const { getHref, getPath } = useLink();
  const history = useHistory();
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const from: CreatePackagePolicyFrom = policyId ? 'policy' : 'package';
  const [isNavDrawerLocked, setIsNavDrawerLocked] = useState(false);

  useEffect(() => {
    const subscription = getIsNavDrawerLocked$().subscribe((newIsNavDrawerLocked: boolean) => {
      setIsNavDrawerLocked(newIsNavDrawerLocked);
    });

    return () => subscription.unsubscribe();
  });

  // Agent policy and package info states
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [isLoadingSecondStep, setIsLoadingSecondStep] = useState<boolean>(false);

  const agentPolicyId = agentPolicy?.id;
  // Retrieve agent count
  useEffect(() => {
    const getAgentCount = async () => {
      if (agentPolicyId) {
        const { data } = await sendGetAgentStatus({ policyId: agentPolicyId });
        if (data?.results.total) {
          setAgentCount(data.results.total);
        }
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

  // Cancel path
  const cancelUrl = useMemo(() => {
    if (routeState && routeState.onCancelUrl) {
      return routeState.onCancelUrl;
    }
    return from === 'policy'
      ? getHref('policy_details', { policyId: agentPolicyId || policyId })
      : getHref('integration_details', { pkgkey });
  }, [agentPolicyId, policyId, from, getHref, pkgkey, routeState]);

  const cancelClickHandler: ReactEventHandler = useCallback(
    (ev) => {
      if (routeState && routeState.onCancelNavigateTo) {
        ev.preventDefault();
        navigateToApp(...routeState.onCancelNavigateTo);
      }
    },
    [routeState, navigateToApp]
  );

  // Save package policy
  const savePackagePolicy = async () => {
    setFormState('LOADING');
    const result = await sendCreatePackagePolicy(packagePolicy);
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
    const { error, data } = await savePackagePolicy();
    if (!error) {
      if (routeState && routeState.onSaveNavigateTo) {
        navigateToApp(
          ...(typeof routeState.onSaveNavigateTo === 'function'
            ? routeState.onSaveNavigateTo(data!.item)
            : routeState.onSaveNavigateTo)
        );
      } else {
        history.push(getPath('policy_details', { policyId: agentPolicy?.id || policyId }));
      }

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.ingestManager.createPackagePolicy.addedNotificationTitle', {
          defaultMessage: `Successfully added '{packagePolicyName}'`,
          values: {
            packagePolicyName: packagePolicy.name,
          },
        }),
        text:
          agentCount && agentPolicy
            ? i18n.translate('xpack.ingestManager.createPackagePolicy.addedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentPolicyName}' policy`,
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
  };

  const layoutProps = {
    from,
    cancelUrl,
    onCancel: cancelClickHandler,
    agentPolicy,
    packageInfo,
  };

  const stepSelectAgentPolicy = useMemo(
    () => (
      <StepSelectAgentPolicy
        pkgkey={pkgkey}
        updatePackageInfo={updatePackageInfo}
        agentPolicy={agentPolicy}
        updateAgentPolicy={updateAgentPolicy}
        setIsLoadingSecondStep={setIsLoadingSecondStep}
      />
    ),
    [pkgkey, updatePackageInfo, agentPolicy, updateAgentPolicy]
  );

  const stepSelectPackage = useMemo(
    () => (
      <StepSelectPackage
        agentPolicyId={policyId}
        updateAgentPolicy={updateAgentPolicy}
        packageInfo={packageInfo}
        updatePackageInfo={updatePackageInfo}
        setIsLoadingSecondStep={setIsLoadingSecondStep}
      />
    ),
    [policyId, updateAgentPolicy, packageInfo, updatePackageInfo]
  );

  const stepConfigurePackagePolicy = useMemo(
    () =>
      isLoadingSecondStep ? (
        <Loading />
      ) : agentPolicy && packageInfo ? (
        <>
          <StepDefinePackagePolicy
            agentPolicy={agentPolicy}
            packageInfo={packageInfo}
            packagePolicy={packagePolicy}
            updatePackagePolicy={updatePackagePolicy}
            validationResults={validationResults!}
          />
          <StepConfigurePackagePolicy
            packageInfo={packageInfo}
            packagePolicy={packagePolicy}
            updatePackagePolicy={updatePackagePolicy}
            validationResults={validationResults!}
            submitAttempted={formState === 'INVALID'}
          />
        </>
      ) : (
        <div />
      ),
    [
      agentPolicy,
      formState,
      isLoadingSecondStep,
      packagePolicy,
      packageInfo,
      updatePackagePolicy,
      validationResults,
    ]
  );

  const steps: EuiStepProps[] = [
    from === 'package'
      ? {
          title: i18n.translate(
            'xpack.ingestManager.createPackagePolicy.stepSelectAgentPolicyTitle',
            {
              defaultMessage: 'Select an agent policy',
            }
          ),
          children: stepSelectAgentPolicy,
        }
      : {
          title: i18n.translate('xpack.ingestManager.createPackagePolicy.stepSelectPackageTitle', {
            defaultMessage: 'Select an integration',
          }),
          children: stepSelectPackage,
        },
    {
      title: i18n.translate(
        'xpack.ingestManager.createPackagePolicy.stepConfigurePackagePolicyTitle',
        {
          defaultMessage: 'Configure integration',
        }
      ),
      status: !packageInfo || !agentPolicy || isLoadingSecondStep ? 'disabled' : undefined,
      'data-test-subj': 'dataCollectionSetupStep',
      children: stepConfigurePackagePolicy,
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
              pkgTitle={packageInfo.title}
              pkgkey={`${packageInfo.name}-${packageInfo.version}`}
            />
          )
        : agentPolicy && (
            <PolicyBreadcrumb policyName={agentPolicy.name} policyId={agentPolicy.id} />
          )}
      <StepsWithLessPadding steps={steps} />
      <EuiSpacer size="l" />
      {/* TODO #64541 - Remove classes */}
      <EuiBottomBar
        className={
          uiSettings.get('pageNavigation') === 'legacy'
            ? isNavDrawerLocked
              ? 'ingestManager__bottomBar-isNavDrawerLocked'
              : 'ingestManager__bottomBar'
            : undefined
        }
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            {!isLoadingSecondStep && agentPolicy && packageInfo && formState === 'INVALID' ? (
              <FormattedMessage
                id="xpack.ingestManager.createPackagePolicy.errorOnSaveText"
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
                    id="xpack.ingestManager.createPackagePolicy.cancelButton"
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
                    id="xpack.ingestManager.createPackagePolicy.saveButton"
                    defaultMessage="Save integration"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
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
}> = ({ pkgTitle, pkgkey }) => {
  useBreadcrumbs('add_integration_to_policy', { pkgTitle, pkgkey });
  return null;
};

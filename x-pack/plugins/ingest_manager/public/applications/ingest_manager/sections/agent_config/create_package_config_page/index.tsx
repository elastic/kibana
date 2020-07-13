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
  AgentConfig,
  PackageInfo,
  NewPackageConfig,
  CreatePackageConfigRouteState,
} from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  sendCreatePackageConfig,
  useCore,
  useConfig,
  sendGetAgentStatus,
} from '../../../hooks';
import { Loading } from '../../../components';
import { ConfirmDeployConfigModal } from '../components';
import { CreatePackageConfigPageLayout } from './components';
import { CreatePackageConfigFrom, PackageConfigFormState } from './types';
import {
  PackageConfigValidationResults,
  validatePackageConfig,
  validationHasErrors,
} from './services';
import { StepSelectPackage } from './step_select_package';
import { StepSelectConfig } from './step_select_config';
import { StepConfigurePackage } from './step_configure_package';
import { StepDefinePackageConfig } from './step_define_package_config';
import { useIntraAppState } from '../../../hooks/use_intra_app_state';

const StepsWithLessPadding = styled(EuiSteps)`
  .euiStep__content {
    padding-bottom: ${(props) => props.theme.eui.paddingSizes.m};
  }
`;

export const CreatePackageConfigPage: React.FunctionComponent = () => {
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
    params: { configId, pkgkey },
  } = useRouteMatch();
  const { getHref, getPath } = useLink();
  const history = useHistory();
  const routeState = useIntraAppState<CreatePackageConfigRouteState>();
  const from: CreatePackageConfigFrom = configId ? 'config' : 'package';
  const [isNavDrawerLocked, setIsNavDrawerLocked] = useState(false);

  useEffect(() => {
    const subscription = getIsNavDrawerLocked$().subscribe((newIsNavDrawerLocked: boolean) => {
      setIsNavDrawerLocked(newIsNavDrawerLocked);
    });

    return () => subscription.unsubscribe();
  });

  // Agent config and package info states
  const [agentConfig, setAgentConfig] = useState<AgentConfig>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [isLoadingSecondStep, setIsLoadingSecondStep] = useState<boolean>(false);

  const agentConfigId = agentConfig?.id;
  // Retrieve agent count
  useEffect(() => {
    const getAgentCount = async () => {
      if (agentConfigId) {
        const { data } = await sendGetAgentStatus({ configId: agentConfigId });
        if (data?.results.total) {
          setAgentCount(data.results.total);
        }
      }
    };

    if (isFleetEnabled && agentConfigId) {
      getAgentCount();
    }
  }, [agentConfigId, isFleetEnabled]);
  const [agentCount, setAgentCount] = useState<number>(0);

  // New package config state
  const [packageConfig, setPackageConfig] = useState<NewPackageConfig>({
    name: '',
    description: '',
    namespace: '',
    config_id: '',
    enabled: true,
    output_id: '', // TODO: Blank for now as we only support default output
    inputs: [],
  });

  // Package config validation state
  const [validationResults, setValidationResults] = useState<PackageConfigValidationResults>();

  // Form state
  const [formState, setFormState] = useState<PackageConfigFormState>('INVALID');

  // Update package info method
  const updatePackageInfo = useCallback(
    (updatedPackageInfo: PackageInfo | undefined) => {
      if (updatedPackageInfo) {
        setPackageInfo(updatedPackageInfo);
        if (agentConfig) {
          setFormState('VALID');
        }
      } else {
        setFormState('INVALID');
        setPackageInfo(undefined);
      }

      // eslint-disable-next-line no-console
      console.debug('Package info updated', updatedPackageInfo);
    },
    [agentConfig, setPackageInfo, setFormState]
  );

  // Update agent config method
  const updateAgentConfig = useCallback(
    (updatedAgentConfig: AgentConfig | undefined) => {
      if (updatedAgentConfig) {
        setAgentConfig(updatedAgentConfig);
        if (packageInfo) {
          setFormState('VALID');
        }
      } else {
        setFormState('INVALID');
        setAgentConfig(undefined);
      }

      // eslint-disable-next-line no-console
      console.debug('Agent config updated', updatedAgentConfig);
    },
    [packageInfo, setAgentConfig, setFormState]
  );

  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Update package config validation
  const updatePackageConfigValidation = useCallback(
    (newPackageConfig?: NewPackageConfig) => {
      if (packageInfo) {
        const newValidationResult = validatePackageConfig(
          newPackageConfig || packageConfig,
          packageInfo
        );
        setValidationResults(newValidationResult);
        // eslint-disable-next-line no-console
        console.debug('Package config validation results', newValidationResult);

        return newValidationResult;
      }
    },
    [packageConfig, packageInfo]
  );

  // Update package config method
  const updatePackageConfig = useCallback(
    (updatedFields: Partial<NewPackageConfig>) => {
      const newPackageConfig = {
        ...packageConfig,
        ...updatedFields,
      };
      setPackageConfig(newPackageConfig);

      // eslint-disable-next-line no-console
      console.debug('Package config updated', newPackageConfig);
      const newValidationResults = updatePackageConfigValidation(newPackageConfig);
      const hasPackage = newPackageConfig.package;
      const hasValidationErrors = newValidationResults
        ? validationHasErrors(newValidationResults)
        : false;
      const hasAgentConfig = newPackageConfig.config_id && newPackageConfig.config_id !== '';
      if (hasPackage && hasAgentConfig && !hasValidationErrors) {
        setFormState('VALID');
      }
    },
    [packageConfig, updatePackageConfigValidation]
  );

  // Cancel path
  const cancelUrl = useMemo(() => {
    if (routeState && routeState.onCancelUrl) {
      return routeState.onCancelUrl;
    }
    return from === 'config'
      ? getHref('configuration_details', { configId: agentConfigId || configId })
      : getHref('integration_details', { pkgkey });
  }, [agentConfigId, configId, from, getHref, pkgkey, routeState]);

  const cancelClickHandler: ReactEventHandler = useCallback(
    (ev) => {
      if (routeState && routeState.onCancelNavigateTo) {
        ev.preventDefault();
        navigateToApp(...routeState.onCancelNavigateTo);
      }
    },
    [routeState, navigateToApp]
  );

  // Save package config
  const savePackageConfig = async () => {
    setFormState('LOADING');
    const result = await sendCreatePackageConfig(packageConfig);
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
    const { error, data } = await savePackageConfig();
    if (!error) {
      if (routeState && routeState.onSaveNavigateTo) {
        navigateToApp(
          ...(typeof routeState.onSaveNavigateTo === 'function'
            ? routeState.onSaveNavigateTo(data!.item)
            : routeState.onSaveNavigateTo)
        );
      } else {
        history.push(getPath('configuration_details', { configId: agentConfig?.id || configId }));
      }

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.ingestManager.createPackageConfig.addedNotificationTitle', {
          defaultMessage: `Successfully added '{packageConfigName}'`,
          values: {
            packageConfigName: packageConfig.name,
          },
        }),
        text:
          agentCount && agentConfig
            ? i18n.translate('xpack.ingestManager.createPackageConfig.addedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentConfigName}' configuration`,
                values: {
                  agentConfigName: agentConfig.name,
                },
              })
            : undefined,
        'data-test-subj': 'packageConfigCreateSuccessToast',
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
    agentConfig,
    packageInfo,
  };

  const stepSelectConfig = useMemo(
    () => (
      <StepSelectConfig
        pkgkey={pkgkey}
        updatePackageInfo={updatePackageInfo}
        agentConfig={agentConfig}
        updateAgentConfig={updateAgentConfig}
        setIsLoadingSecondStep={setIsLoadingSecondStep}
      />
    ),
    [pkgkey, updatePackageInfo, agentConfig, updateAgentConfig]
  );

  const stepSelectPackage = useMemo(
    () => (
      <StepSelectPackage
        agentConfigId={configId}
        updateAgentConfig={updateAgentConfig}
        packageInfo={packageInfo}
        updatePackageInfo={updatePackageInfo}
        setIsLoadingSecondStep={setIsLoadingSecondStep}
      />
    ),
    [configId, updateAgentConfig, packageInfo, updatePackageInfo]
  );

  const stepConfigurePackage = useMemo(
    () =>
      isLoadingSecondStep ? (
        <Loading />
      ) : agentConfig && packageInfo ? (
        <>
          <StepDefinePackageConfig
            agentConfig={agentConfig}
            packageInfo={packageInfo}
            packageConfig={packageConfig}
            updatePackageConfig={updatePackageConfig}
            validationResults={validationResults!}
          />
          <StepConfigurePackage
            packageInfo={packageInfo}
            packageConfig={packageConfig}
            updatePackageConfig={updatePackageConfig}
            validationResults={validationResults!}
            submitAttempted={formState === 'INVALID'}
          />
        </>
      ) : (
        <div />
      ),
    [
      agentConfig,
      formState,
      isLoadingSecondStep,
      packageConfig,
      packageInfo,
      updatePackageConfig,
      validationResults,
    ]
  );

  const steps: EuiStepProps[] = [
    from === 'package'
      ? {
          title: i18n.translate(
            'xpack.ingestManager.createPackageConfig.stepSelectAgentConfigTitle',
            {
              defaultMessage: 'Select an agent configuration',
            }
          ),
          children: stepSelectConfig,
        }
      : {
          title: i18n.translate('xpack.ingestManager.createPackageConfig.stepSelectPackageTitle', {
            defaultMessage: 'Select an integration',
          }),
          children: stepSelectPackage,
        },
    {
      title: i18n.translate(
        'xpack.ingestManager.createPackageConfig.stepConfigurePackageConfigTitle',
        {
          defaultMessage: 'Configure integration',
        }
      ),
      status: !packageInfo || !agentConfig || isLoadingSecondStep ? 'disabled' : undefined,
      'data-test-subj': 'dataCollectionSetupStep',
      children: stepConfigurePackage,
    },
  ];

  return (
    <CreatePackageConfigPageLayout {...layoutProps} data-test-subj="createPackageConfig">
      {formState === 'CONFIRM' && agentConfig && (
        <ConfirmDeployConfigModal
          agentCount={agentCount}
          agentConfig={agentConfig}
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
        : agentConfig && (
            <ConfigurationBreadcrumb configName={agentConfig.name} configId={agentConfig.id} />
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
            {!isLoadingSecondStep && agentConfig && packageInfo && formState === 'INVALID' ? (
              <FormattedMessage
                id="xpack.ingestManager.createPackageConfig.errorOnSaveText"
                defaultMessage="Your integration configuration has errors. Please fix them before saving."
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
                  data-test-subj="createPackageConfigCancelButton"
                >
                  <FormattedMessage
                    id="xpack.ingestManager.createPackageConfig.cancelButton"
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
                  data-test-subj="createPackageConfigSaveButton"
                >
                  <FormattedMessage
                    id="xpack.ingestManager.createPackageConfig.saveButton"
                    defaultMessage="Save integration"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    </CreatePackageConfigPageLayout>
  );
};

const ConfigurationBreadcrumb: React.FunctionComponent<{
  configName: string;
  configId: string;
}> = ({ configName, configId }) => {
  useBreadcrumbs('add_integration_from_configuration', { configName, configId });
  return null;
};

const IntegrationBreadcrumb: React.FunctionComponent<{
  pkgTitle: string;
  pkgkey: string;
}> = ({ pkgTitle, pkgkey }) => {
  useBreadcrumbs('add_integration_to_configuration', { pkgTitle, pkgkey });
  return null;
};

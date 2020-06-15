/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect, useMemo, useCallback, ReactEventHandler } from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
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
  NewDatasource,
  CreateDatasourceRouteState,
} from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  sendCreateDatasource,
  useCore,
  useConfig,
  sendGetAgentStatus,
} from '../../../hooks';
import { ConfirmDeployConfigModal } from '../components';
import { CreateDatasourcePageLayout } from './components';
import { CreateDatasourceFrom, DatasourceFormState } from './types';
import { DatasourceValidationResults, validateDatasource, validationHasErrors } from './services';
import { StepSelectPackage } from './step_select_package';
import { StepSelectConfig } from './step_select_config';
import { StepConfigureDatasource } from './step_configure_datasource';
import { StepDefineDatasource } from './step_define_datasource';
import { useIntraAppState } from '../../../hooks/use_intra_app_state';

export const CreateDatasourcePage: React.FunctionComponent = () => {
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
  const routeState = useIntraAppState<CreateDatasourceRouteState>();
  const from: CreateDatasourceFrom = configId ? 'config' : 'package';
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

  // New datasource state
  const [datasource, setDatasource] = useState<NewDatasource>({
    name: '',
    description: '',
    config_id: '',
    enabled: true,
    output_id: '', // TODO: Blank for now as we only support default output
    inputs: [],
  });

  // Datasource validation state
  const [validationResults, setValidationResults] = useState<DatasourceValidationResults>();

  // Form state
  const [formState, setFormState] = useState<DatasourceFormState>('INVALID');

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

  // Update datasource method
  const updateDatasource = (updatedFields: Partial<NewDatasource>) => {
    const newDatasource = {
      ...datasource,
      ...updatedFields,
    };
    setDatasource(newDatasource);

    // eslint-disable-next-line no-console
    console.debug('Datasource updated', newDatasource);
    const newValidationResults = updateDatasourceValidation(newDatasource);
    const hasPackage = newDatasource.package;
    const hasValidationErrors = newValidationResults
      ? validationHasErrors(newValidationResults)
      : false;
    const hasAgentConfig = newDatasource.config_id && newDatasource.config_id !== '';
    if (hasPackage && hasAgentConfig && !hasValidationErrors) {
      setFormState('VALID');
    }
  };

  const updateDatasourceValidation = (newDatasource?: NewDatasource) => {
    if (packageInfo) {
      const newValidationResult = validateDatasource(newDatasource || datasource, packageInfo);
      setValidationResults(newValidationResult);
      // eslint-disable-next-line no-console
      console.debug('Datasource validation results', newValidationResult);

      return newValidationResult;
    }
  };

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

  // Save datasource
  const saveDatasource = async () => {
    setFormState('LOADING');
    const result = await sendCreateDatasource(datasource);
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
    const { error, data } = await saveDatasource();
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
        title: i18n.translate('xpack.ingestManager.createDatasource.addedNotificationTitle', {
          defaultMessage: `Successfully added '{datasourceName}'`,
          values: {
            datasourceName: datasource.name,
          },
        }),
        text:
          agentCount && agentConfig
            ? i18n.translate('xpack.ingestManager.createDatasource.addedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentConfigName}' configuration`,
                values: {
                  agentConfigName: agentConfig.name,
                },
              })
            : undefined,
        'data-test-subj': 'datasourceCreateSuccessToast',
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
    cancelOnClick: cancelClickHandler,
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
      />
    ),
    [configId, updateAgentConfig, packageInfo, updatePackageInfo]
  );

  const steps: EuiStepProps[] = [
    from === 'package'
      ? {
          title: i18n.translate('xpack.ingestManager.createDatasource.stepSelectAgentConfigTitle', {
            defaultMessage: 'Select an agent configuration',
          }),
          children: stepSelectConfig,
        }
      : {
          title: i18n.translate('xpack.ingestManager.createDatasource.stepSelectPackageTitle', {
            defaultMessage: 'Select an integration',
          }),
          children: stepSelectPackage,
        },
    {
      title: i18n.translate('xpack.ingestManager.createDatasource.stepDefineDatasourceTitle', {
        defaultMessage: 'Define your data source',
      }),
      status: !packageInfo || !agentConfig ? 'disabled' : undefined,
      children:
        agentConfig && packageInfo ? (
          <StepDefineDatasource
            agentConfig={agentConfig}
            packageInfo={packageInfo}
            datasource={datasource}
            updateDatasource={updateDatasource}
            validationResults={validationResults!}
          />
        ) : null,
    },
    {
      title: i18n.translate('xpack.ingestManager.createDatasource.stepConfgiureDatasourceTitle', {
        defaultMessage: 'Select the data you want to collect',
      }),
      status: !packageInfo || !agentConfig ? 'disabled' : undefined,
      'data-test-subj': 'dataCollectionSetupStep',
      children:
        agentConfig && packageInfo ? (
          <StepConfigureDatasource
            packageInfo={packageInfo}
            datasource={datasource}
            updateDatasource={updateDatasource}
            validationResults={validationResults!}
            submitAttempted={formState === 'INVALID'}
          />
        ) : null,
    },
  ];

  return (
    <CreateDatasourcePageLayout {...layoutProps} data-test-subj="createDataSource">
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
      <EuiSteps steps={steps} />
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
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButtonEmpty
              color="ghost"
              href={cancelUrl}
              onClick={cancelClickHandler}
              data-test-subj="createDatasourceCancelButton"
            >
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.cancelButton"
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
              data-test-subj="createDatasourceSaveButton"
            >
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.saveButton"
                defaultMessage="Save data source"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    </CreateDatasourcePageLayout>
  );
};

const ConfigurationBreadcrumb: React.FunctionComponent<{
  configName: string;
  configId: string;
}> = ({ configName, configId }) => {
  useBreadcrumbs('add_datasource_from_configuration', { configName, configId });
  return null;
};

const IntegrationBreadcrumb: React.FunctionComponent<{
  pkgTitle: string;
  pkgkey: string;
}> = ({ pkgTitle, pkgkey }) => {
  useBreadcrumbs('add_datasource_from_integration', { pkgTitle, pkgkey });
  return null;
};

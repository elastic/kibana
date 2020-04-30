/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
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
import { AGENT_CONFIG_DETAILS_PATH } from '../../../constants';
import { AgentConfig, PackageInfo, NewDatasource } from '../../../types';
import {
  useLink,
  sendCreateDatasource,
  useCore,
  useConfig,
  sendGetAgentStatus,
} from '../../../hooks';
import { useLinks as useEPMLinks } from '../../epm/hooks';
import { ConfirmDeployConfigModal } from '../components';
import { CreateDatasourcePageLayout } from './components';
import { CreateDatasourceFrom, DatasourceFormState } from './types';
import { DatasourceValidationResults, validateDatasource, validationHasErrors } from './services';
import { StepSelectPackage } from './step_select_package';
import { StepSelectConfig } from './step_select_config';
import { StepConfigureDatasource } from './step_configure_datasource';
import { StepDefineDatasource } from './step_define_datasource';

export const CreateDatasourcePage: React.FunctionComponent = () => {
  const {
    notifications,
    chrome: { getIsNavDrawerLocked$ },
  } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const {
    params: { configId, pkgkey },
  } = useRouteMatch();
  const history = useHistory();
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

  // Update package info method
  const updatePackageInfo = (updatedPackageInfo: PackageInfo | undefined) => {
    if (updatedPackageInfo) {
      setPackageInfo(updatedPackageInfo);
      setFormState('VALID');
    } else {
      setFormState('INVALID');
      setPackageInfo(undefined);
    }

    // eslint-disable-next-line no-console
    console.debug('Package info updated', updatedPackageInfo);
  };

  // Update agent config method
  const updateAgentConfig = (updatedAgentConfig: AgentConfig | undefined) => {
    if (updatedAgentConfig) {
      setAgentConfig(updatedAgentConfig);
    } else {
      setFormState('INVALID');
      setAgentConfig(undefined);
    }

    // eslint-disable-next-line no-console
    console.debug('Agent config updated', updatedAgentConfig);
  };

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

  // Cancel url
  const CONFIG_URL = useLink(
    `${AGENT_CONFIG_DETAILS_PATH}${agentConfig ? agentConfig.id : configId}`
  );
  const PACKAGE_URL = useEPMLinks().toDetailView({
    name: (pkgkey || '-').split('-')[0],
    version: (pkgkey || '-').split('-')[1],
  });
  const cancelUrl = from === 'config' ? CONFIG_URL : PACKAGE_URL;

  // Save datasource
  const [formState, setFormState] = useState<DatasourceFormState>('INVALID');
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
    const { error } = await saveDatasource();
    if (!error) {
      history.push(`${AGENT_CONFIG_DETAILS_PATH}${agentConfig ? agentConfig.id : configId}`);
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
    agentConfig,
    packageInfo,
  };

  const steps: EuiStepProps[] = [
    from === 'package'
      ? {
          title: i18n.translate('xpack.ingestManager.createDatasource.stepSelectAgentConfigTitle', {
            defaultMessage: 'Select an agent configuration',
          }),
          children: (
            <StepSelectConfig
              pkgkey={pkgkey}
              updatePackageInfo={updatePackageInfo}
              agentConfig={agentConfig}
              updateAgentConfig={updateAgentConfig}
            />
          ),
        }
      : {
          title: i18n.translate('xpack.ingestManager.createDatasource.stepSelectPackageTitle', {
            defaultMessage: 'Select an integration',
          }),
          children: (
            <StepSelectPackage
              agentConfigId={configId}
              updateAgentConfig={updateAgentConfig}
              packageInfo={packageInfo}
              updatePackageInfo={updatePackageInfo}
            />
          ),
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
    <CreateDatasourcePageLayout {...layoutProps}>
      {formState === 'CONFIRM' && agentConfig && (
        <ConfirmDeployConfigModal
          agentCount={agentCount}
          agentConfig={agentConfig}
          onConfirm={onSubmit}
          onCancel={() => setFormState('VALID')}
        />
      )}
      <EuiSteps steps={steps} />
      <EuiSpacer size="l" />
      <EuiBottomBar
        css={{ zIndex: 5 }}
        className={
          isNavDrawerLocked
            ? 'ingestManager__bottomBar-isNavDrawerLocked'
            : 'ingestManager__bottomBar'
        }
      >
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="ghost" href={cancelUrl}>
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

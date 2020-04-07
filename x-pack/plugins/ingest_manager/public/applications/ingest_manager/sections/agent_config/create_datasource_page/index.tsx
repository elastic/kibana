/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
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
} from '@elastic/eui';
import { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import { AGENT_CONFIG_DETAILS_PATH } from '../../../constants';
import { AgentConfig, PackageInfo, NewDatasource } from '../../../types';
import { useLink, sendCreateDatasource, useCore } from '../../../hooks';
import { useLinks as useEPMLinks } from '../../epm/hooks';
import { CreateDatasourcePageLayout } from './components';
import { CreateDatasourceFrom, CreateDatasourceStep } from './types';
import { StepSelectPackage } from './step_select_package';
import { StepSelectConfig } from './step_select_config';
import { StepConfigureDatasource } from './step_configure_datasource';

import { StepDefineDatasource } from './step_define_datasource';

export const CreateDatasourcePage: React.FunctionComponent = () => {
  const { notifications } = useCore();
  const {
    params: { configId, pkgkey },
    url: basePath,
  } = useRouteMatch();
  const history = useHistory();
  const from: CreateDatasourceFrom = configId ? 'config' : 'package';
  const [maxStep, setMaxStep] = useState<CreateDatasourceStep | ''>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Agent config and package info states
  const [agentConfig, setAgentConfig] = useState<AgentConfig>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();

  // New datasource state
  const [datasource, setDatasource] = useState<NewDatasource>({
    name: '',
    description: '',
    config_id: '',
    enabled: true,
    output_id: '', // TODO: Blank for now as we only support default output
    inputs: [],
  });

  // Update package info method
  const updatePackageInfo = (updatedPackageInfo: PackageInfo | undefined) => {
    if (updatedPackageInfo) {
      setPackageInfo(updatedPackageInfo);
    } else {
      setPackageInfo(undefined);
      setMaxStep('');
    }

    // eslint-disable-next-line no-console
    console.debug('Package info updated', updatedPackageInfo);
  };

  // Update agent config method
  const updateAgentConfig = (updatedAgentConfig: AgentConfig | undefined) => {
    if (updatedAgentConfig) {
      setAgentConfig(updatedAgentConfig);
    } else {
      setAgentConfig(undefined);
      setMaxStep('');
    }

    // eslint-disable-next-line no-console
    console.debug('Agent config updated', updatedAgentConfig);
  };

  // Update datasource method
  const updateDatasource = (updatedFields: Partial<NewDatasource>) => {
    const newDatasource = {
      ...datasource,
      ...updatedFields,
    };
    setDatasource(newDatasource);

    // eslint-disable-next-line no-console
    console.debug('Datasource updated', newDatasource);
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
  const saveDatasource = async () => {
    setIsSaving(true);
    const result = await sendCreateDatasource(datasource);
    setIsSaving(false);
    return result;
  };

  const onSubmit = async () => {
    const { error } = await saveDatasource();
    if (!error) {
      history.push(`${AGENT_CONFIG_DETAILS_PATH}${agentConfig ? agentConfig.id : configId}`);
    } else {
      notifications.toasts.addError(error, {
        title: 'Error',
      });
    }
  };

  const layoutProps = {
    from,
    basePath,
    cancelUrl,
    maxStep,
    agentConfig,
    packageInfo,
  };

  const steps: EuiStepProps[] = [
    from === 'package'
      ? {
          title: i18n.translate('xpack.ingestManager.createDatasource.stepSelectAgentConfigTitle', {
            defaultMessage: 'Select an Agent configuration',
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
            agentConfig={agentConfig}
            packageInfo={packageInfo}
            datasource={datasource}
            updateDatasource={updateDatasource}
          />
        ) : null,
    },
  ];

  return (
    <CreateDatasourcePageLayout {...layoutProps}>
      <EuiSteps steps={steps} />
      {packageInfo && agentConfig && (
        <EuiBottomBar>
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
                isLoading={isSaving}
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
      )}
    </CreateDatasourcePageLayout>
  );
};

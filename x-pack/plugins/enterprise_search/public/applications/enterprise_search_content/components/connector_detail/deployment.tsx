/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import useLocalStorage from 'react-use/lib/useLocalStorage';

import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorStatus } from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';

import { GetApiKeyByIdLogic } from '../../api/api_key/get_api_key_by_id_api_logic';

import { GenerateConnectorApiKeyApiLogic } from '../../api/connector/generate_connector_api_key_api_logic';

import { ConnectorLinked } from './components/connector_linked';
import { DockerInstructionsStep } from './components/docker_instructions_step';
import { GenerateConfigButton } from './components/generate_config_button';
import { GeneratedConfigFields } from './components/generated_config_fields';
import { RunFromSourceStep } from './components/run_from_source_step';
import { RunOptionsButtons } from './components/run_options_buttons';
import { WaitingForConnectorStep } from './components/waiting_for_connector_step';
import { ConnectorViewLogic } from './connector_view_logic';
import { DeploymentLogic } from './deployment_logic';

export const ConnectorDeployment: React.FC = () => {
  const [selectedDeploymentMethod, setSelectedDeploymentMethod] = useState<'docker' | 'source'>(
    'docker'
  );
  const { generatedData, isGenerateLoading } = useValues(DeploymentLogic);
  const { index, isLoading, connector, connectorId } = useValues(ConnectorViewLogic);
  const { fetchConnector } = useActions(ConnectorViewLogic);
  const { generateConfiguration } = useActions(DeploymentLogic);
  const { makeRequest: getApiKeyById } = useActions(GetApiKeyByIdLogic);
  const { data: apiKeyMetaData } = useValues(GetApiKeyByIdLogic);
  const { makeRequest: generateConnectorApiKey } = useActions(GenerateConnectorApiKeyApiLogic);
  const { status, data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);

  const [connectorUiOptions, setConnectorUiOptions] = useLocalStorage<
    Record<string, { deploymentMethod: 'docker' | 'source' }>
  >('search:connector-ui-options', {});

  useEffect(() => {
    if (connectorUiOptions && connectorId && connectorUiOptions[connectorId]) {
      setSelectedDeploymentMethod(connectorUiOptions[connectorId].deploymentMethod);
    } else {
      selectDeploymentMethod('docker');
    }
  }, [connectorUiOptions, connectorId]);

  useEffect(() => {
    if (connectorId && connector && connector.api_key_id) {
      getApiKeyById(connector.api_key_id);
    }
  }, [connector, connectorId]);

  if (!connector || connector.is_native) {
    return <></>;
  }

  const selectDeploymentMethod = (deploymentMethod: 'docker' | 'source') => {
    setSelectedDeploymentMethod(deploymentMethod);
    setConnectorUiOptions({
      ...connectorUiOptions,
      [connector.id]: { deploymentMethod },
    });
  };

  const hasApiKey = !!(connector.api_key_id ?? generatedData?.apiKey);

  const isWaitingForConnector = !connector.status || connector.status === ConnectorStatus.CREATED;
  const apiKey = generatedData?.apiKey || apiKeyData || apiKeyMetaData;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder>
          <>
            <EuiTitle size="s">
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.connector_detail.configurationConnector.DeploymentTitle',
                  {
                    defaultMessage: 'Deployment',
                  }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer />
            <EuiSteps
              steps={[
                {
                  children: (
                    <RunOptionsButtons
                      selectDeploymentMethod={selectDeploymentMethod}
                      selectedDeploymentMethod={selectedDeploymentMethod}
                    />
                  ),
                  status: selectedDeploymentMethod === null ? 'incomplete' : 'complete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.runConnectorService.title',
                    {
                      defaultMessage: 'Run connector service',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="s">
                        {selectedDeploymentMethod === 'source' ? (
                          <FormattedMessage
                            id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.configureIndexAndApiKey.description.source"
                            defaultMessage="When you generate a configuration, Elastic will create an index, an API key and a Connector ID. You'll need to add this information to the {configYaml} file for your connector. Alternatively use an existing index and API key. "
                            values={{
                              configYaml: (
                                <EuiCode>
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.connectorConfiguration.configymlCodeBlockLabel',
                                    { defaultMessage: 'config.yml' }
                                  )}
                                </EuiCode>
                              ),
                            }}
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.configureIndexAndApiKey.description.docker"
                            defaultMessage="When you generate a configuration, Elastic will create an index, an API key and a Connector ID. Alternatively use an existing index and API key."
                          />
                        )}
                      </EuiText>

                      <EuiSpacer />
                      {hasApiKey && connector.index_name ? (
                        <GeneratedConfigFields
                          apiKey={apiKey}
                          connector={connector}
                          generateApiKey={() => {
                            if (connector.index_name) {
                              generateConnectorApiKey({
                                indexName: connector.index_name,
                                isNative: connector.is_native,
                              });
                            }
                          }}
                          isGenerateLoading={status === Status.LOADING}
                        />
                      ) : (
                        <GenerateConfigButton
                          connectorId={connector.id}
                          generateConfiguration={generateConfiguration}
                          isGenerateLoading={isGenerateLoading}
                        />
                      )}
                    </>
                  ),
                  status: hasApiKey ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.generateApiKey.title',
                    {
                      defaultMessage: 'Configure index and API key',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <>
                      <EuiSpacer size="s" />
                      {selectedDeploymentMethod === 'source' ? (
                        <RunFromSourceStep
                          connectorId={connectorId ?? ''}
                          serviceType={connector.service_type ?? ''}
                          apiKeyData={apiKey}
                          isWaitingForConnector={isWaitingForConnector}
                        />
                      ) : (
                        <DockerInstructionsStep
                          connectorId={connectorId ?? ''}
                          hasApiKey={hasApiKey}
                          serviceType={connector.service_type ?? ''}
                          isWaitingForConnector={isWaitingForConnector}
                          apiKeyData={apiKey}
                        />
                      )}
                    </>
                  ),
                  status:
                    !connector.status || connector.status === ConnectorStatus.CREATED
                      ? 'incomplete'
                      : 'complete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.runConnector.title',
                    {
                      defaultMessage: 'Run connector service',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: isWaitingForConnector ? (
                    <WaitingForConnectorStep
                      isLoading={isLoading}
                      isRecheckDisabled={!index}
                      recheck={() => fetchConnector({ connectorId: connector.id })}
                    />
                  ) : (
                    <ConnectorLinked />
                  ),
                  status: isWaitingForConnector ? 'loading' : 'complete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.title',
                    {
                      defaultMessage: 'Waiting for your connector',
                    }
                  ),
                  titleSize: 'xs',
                },
              ]}
            />
          </>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

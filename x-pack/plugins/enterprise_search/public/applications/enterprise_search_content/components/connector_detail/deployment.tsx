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
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorStatus } from '@kbn/search-connectors';

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
  const [selectedDeploymentMethod, setSelectedDeploymentMethod] = useState<
    'docker' | 'source' | null
  >(null);
  const { generatedData, isGenerateLoading } = useValues(DeploymentLogic);
  const { index, isLoading, connector, connectorId } = useValues(ConnectorViewLogic);
  const { fetchConnector } = useActions(ConnectorViewLogic);
  const { generateConfiguration } = useActions(DeploymentLogic);

  const [connectorUiOptions, setConnectorUiOptions] = useLocalStorage<
    Record<string, { deploymentMethod: 'docker' | 'source' | null }>
  >('search:connector-ui-options', {});

  useEffect(() => {
    if (connectorUiOptions && connectorId && connectorUiOptions[connectorId]) {
      setSelectedDeploymentMethod(connectorUiOptions[connectorId].deploymentMethod);
    }
  }, [connectorUiOptions, connectorId]);

  if (!connector) {
    return <></>;
  }

  const selectDeploymentMethod = (deploymentMethod: 'docker' | 'source') => {
    setSelectedDeploymentMethod(deploymentMethod);
    setConnectorUiOptions({
      ...connectorUiOptions,
      [connector.id]: { deploymentMethod },
    });
  };
  // TODO figure out
  if (connector.is_native) {
    return <></>;
  }

  const hasApiKey = !!(connector.api_key_id ?? generatedData?.apiKey);

  const isWaitingForConnector = !connector.status || connector.status === ConnectorStatus.CREATED;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder>
          <>
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
                      {hasApiKey ? (
                        <GeneratedConfigFields
                          apiKey={generatedData?.apiKey}
                          connector={connector}
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
                          hasApiKey={hasApiKey}
                          serviceType={connector.service_type ?? ''}
                          apiKeyData={generatedData?.apiKey}
                          isWaitingForConnector={isWaitingForConnector}
                        />
                      ) : (
                        <DockerInstructionsStep
                          connectorId={connectorId ?? ''}
                          hasApiKey={hasApiKey}
                          serviceType={connector.service_type ?? ''}
                          isWaitingForConnector={isWaitingForConnector}
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

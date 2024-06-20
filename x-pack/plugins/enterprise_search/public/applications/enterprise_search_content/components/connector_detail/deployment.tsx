/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import dedent from 'dedent';
import { useActions, useValues } from 'kea';

import useLocalStorage from 'react-use/lib/useLocalStorage';

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiCallOut,
  EuiButton,
  EuiCheckableCard,
  EuiCode,
  EuiButtonIcon,
  EuiIcon,
  EuiSkeletonRectangle,
  EuiFlexGrid,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { CodeBox } from '@kbn/search-api-panels';
import { ConnectorStatus } from '@kbn/search-connectors';

import { useCloudDetails } from '../../../shared/cloud_details/cloud_details';
import { GenerateConnectorApiKeyApiLogic } from '../../api/connector/generate_connector_api_key_api_logic';

import { getConnectorTemplate, getRunFromDockerSnippet } from '../search_index/connector/constants';

import { ConnectorViewLogic } from './connector_view_logic';
import { DeploymentLogic } from './deployment_logic';

export const ConnectorDeployment: React.FC = () => {
  const [selectedDeploymentMethod, setSelectedDeploymentMethod] = useState<
    'docker' | 'source' | null
  >(null);
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);
  const { index, isLoading, connector, connectorId } = useValues(ConnectorViewLogic);
  const { fetchConnector } = useActions(ConnectorViewLogic);
  const { generateConfiguration } = useActions(DeploymentLogic);
  const { elasticsearchUrl } = useCloudDetails();

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
  if (connector.is_native && connector.service_type) {
    return <></>;
  }

  const hasApiKey = !!(connector.api_key_id ?? apiKeyData);

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
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.description"
                          defaultMessage="The connector service is a Python package that you host on your own infrastructure. You can deploy with Docker or, optionally, run from source."
                        />
                        <EuiSpacer />
                        <EuiFlexGroup direction="row">
                          <EuiFlexItem>
                            <EuiCheckableCard
                              onChange={() => selectDeploymentMethod('docker')}
                              id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.runConnectorService.docker"
                              checked={selectedDeploymentMethod === 'docker'}
                              label={
                                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                                  <EuiFlexItem grow={false}>
                                    <EuiIcon type="logoDocker" size="l" />
                                  </EuiFlexItem>
                                  <EuiFlexItem grow={false}>
                                    <EuiText>
                                      {i18n.translate(
                                        'xpack.enterpriseSearch.connectorConfiguration.dockerTextLabel',
                                        { defaultMessage: 'Run with Docker' }
                                      )}
                                    </EuiText>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                              }
                            />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiCheckableCard
                              onChange={() => selectDeploymentMethod('source')}
                              id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.runConnectorService.source"
                              checked={selectedDeploymentMethod === 'source'}
                              label={
                                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                                  <EuiFlexItem grow={false}>
                                    <EuiIcon type="logoGithub" size="l" />
                                  </EuiFlexItem>
                                  <EuiFlexItem grow={false}>
                                    <EuiText>
                                      {i18n.translate(
                                        'xpack.enterpriseSearch.connectorConfiguration.sourceTextLabel',
                                        { defaultMessage: 'Run from source' }
                                      )}
                                    </EuiText>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                              }
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiText>
                    </>
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
                        <>
                          <EuiFlexGrid columns={3}>
                            <EuiFlexItem>
                              <EuiFlexGroup responsive={false} gutterSize="xs">
                                <EuiFlexItem grow={false}>
                                  <EuiIcon type="check" />
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.connectorDeployment.connectorCreatedFlexItemLabel',
                                    { defaultMessage: 'Connector created' }
                                  )}
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            <EuiFlexItem>{connector.name}</EuiFlexItem>
                            <EuiFlexItem>{connector.id}</EuiFlexItem>
                            <EuiFlexItem>
                              <EuiFlexGroup responsive={false} gutterSize="xs">
                                <EuiFlexItem grow={false}>
                                  <EuiIcon type="check" />
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.connectorDeployment.indexCreatedFlexItemLabel',
                                    { defaultMessage: 'Index created' }
                                  )}
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            <EuiFlexItem>{connector.index_name}</EuiFlexItem>
                            <EuiFlexItem />
                            <EuiFlexItem>
                              <EuiFlexGroup responsive={false} gutterSize="xs">
                                <EuiFlexItem grow={false}>
                                  <EuiIcon type="check" />
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.connectorDeployment.apiKeyCreatedFlexItemLabel',
                                    { defaultMessage: 'API key created' }
                                  )}
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            <EuiFlexItem>{connector.api_key_id}</EuiFlexItem>
                            <EuiFlexItem>{apiKeyData?.api_key}</EuiFlexItem>
                          </EuiFlexGrid>
                        </>
                      ) : (
                        <EuiFlexGroup
                          direction="row"
                          gutterSize="xs"
                          responsive={false}
                          alignItems="center"
                        >
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              data-test-subj="entSearchContent-connector-configuration-generateConfigButton"
                              data-telemetry-id="entSearchContent-connector-configuration-generateConfigButton"
                              fill
                              iconType="sparkles"
                              onClick={() => {
                                if (!index) {
                                  generateConfiguration({ connectorId: connector.id });
                                }
                              }}
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.generateApiKey.button.label',
                                {
                                  defaultMessage: 'Generate configuration',
                                }
                              )}
                            </EuiButton>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButtonIcon
                              data-test-subj="entSearchContent-connector-configuration-moreOptionsButton"
                              data-telemetry-id="entSearchContent-connector-configuration-moreOptionsButton"
                              display="fill"
                              iconType="boxesVertical"
                              size="m"
                              aria-label={i18n.translate(
                                'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.generateApiKey.moreOptionsButton.label',
                                {
                                  defaultMessage: 'More options',
                                }
                              )}
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
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
                      {selectedDeploymentMethod === 'docker' ? (
                        <>
                          <EuiText size="s">
                            <p>
                              {i18n.translate(
                                'xpack.enterpriseSearch.connectorDeployment.p.runTheFollowingCommandLabel',
                                {
                                  defaultMessage:
                                    'Run the following command in your terminal. Make sure you have Docker installed on your machine',
                                }
                              )}
                            </p>
                          </EuiText>
                          <EuiSpacer size="s" />
                        </>
                      ) : (
                        <>
                          <EuiText size="s">
                            <p>
                              {i18n.translate(
                                'xpack.enterpriseSearch.connectorDeployment.p.addTheFollowingConfigurationLabel',
                                {
                                  defaultMessage:
                                    'Clone or download the repo to your local machine',
                                }
                              )}
                            </p>
                          </EuiText>
                          <EuiSpacer size="s" />
                          <EuiCode>git clone https://github.com/elastic/connectors</EuiCode>&nbsp;
                          {i18n.translate('xpack.enterpriseSearch.connectorDeployment.orLabel', {
                            defaultMessage: 'or',
                          })}
                          &nbsp;
                          <EuiButton
                            data-test-subj="enterpriseSearchConnectorDeploymentGoToSourceButton"
                            iconType="logoGithub"
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.connectorDeployment.goToSourceButtonLabel',
                              { defaultMessage: 'Go to Source' }
                            )}
                          </EuiButton>
                          <EuiSpacer size="s" />
                          <EuiText size="s">
                            <p>
                              <FormattedMessage
                                id="xpack.enterpriseSearch.connectorDeployment.p.runTheFollowingCommandsLabel"
                                defaultMessage="Edit the {configYaml} file and provide the following configuration"
                                values={{
                                  configYaml: (
                                    <EuiCode>
                                      {i18n.translate(
                                        'xpack.enterpriseSearch.connectorDeployment.configYamlCodeBlockLabel',
                                        { defaultMessage: 'config.yml' }
                                      )}
                                    </EuiCode>
                                  ),
                                }}
                              />
                            </p>
                          </EuiText>
                          <EuiSpacer size="s" />
                        </>
                      )}
                      {hasApiKey ? (
                        <CodeBox
                          languageType="yaml"
                          codeSnippet={
                            selectedDeploymentMethod === 'docker'
                              ? getRunFromDockerSnippet({
                                  connectorId: connectorId ?? '',
                                  elasticsearchHost: elasticsearchUrl ?? 'http://localhost:9200',
                                  serviceType: connector.service_type ?? '',
                                })
                              : getConnectorTemplate({
                                  apiKeyData,
                                  connectorData: {
                                    id: connectorId ?? '',
                                    service_type: connector.service_type,
                                  },
                                  host: elasticsearchUrl,
                                })
                          }
                        />
                      ) : (
                        <EuiSkeletonRectangle width="100%" height={148} />
                      )}
                      {selectedDeploymentMethod === 'source' && (
                        <>
                          <EuiSpacer size="s" />
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.enterpriseSearch.connectorDeployment.p.runTheFollowingCommandLabel',
                                { defaultMessage: 'Compile and run' }
                              )}
                            </p>
                          </EuiText>
                          <EuiSpacer size="s" />
                          <CodeBox
                            languageType="bash"
                            codeSnippet={dedent`
                              make install
                              make run
                              `}
                          />
                        </>
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
                  children: (
                    <>
                      <EuiSpacer />
                      <EuiCallOut
                        color="warning"
                        title={i18n.translate(
                          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.title',
                          {
                            defaultMessage: 'Waiting for your connector',
                          }
                        )}
                        iconType="iInCircle"
                      >
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.description',
                          {
                            defaultMessage:
                              'Your connector has not connected to Search. Troubleshoot your configuration and refresh the page.',
                          }
                        )}
                        <EuiSpacer size="s" />
                        <EuiFlexGroup direction="row" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              color="warning"
                              fill
                              disabled={!index}
                              data-test-subj="entSearchContent-connector-waitingForConnector-callout-recheckNow"
                              data-telemetry-id="entSearchContent-connector-waitingForConnector-callout-recheckNow"
                              iconType="refresh"
                              onClick={() => fetchConnector({ connectorId: connector.id })}
                              isLoading={isLoading}
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.button.label',
                                {
                                  defaultMessage: 'Recheck now',
                                }
                              )}
                            </EuiButton>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              color="warning"
                              data-test-subj="entSearchContent-connector-waitingForConnector-callout-finishLaterButton"
                              data-telemetry-id="entSearchContent-connector-waitingForConnector-callout-finishLaterButton"
                              iconType="save"
                              onClick={() => {}}
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.finishLaterButton.label',
                                {
                                  defaultMessage: 'Finish deployment later',
                                }
                              )}
                            </EuiButton>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiCallOut>
                    </>
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

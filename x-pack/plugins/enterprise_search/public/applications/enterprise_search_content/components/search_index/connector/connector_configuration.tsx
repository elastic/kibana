/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiCodeBlock,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorStatus } from '../../../../../../common/types/connectors';
import { docLinks } from '../../../../shared/doc_links';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { EuiButtonTo, EuiLinkTo } from '../../../../shared/react_router_helpers';

import { GenerateConnectorApiKeyApiLogic } from '../../../api/connector/generate_connector_api_key_api_logic';
import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { isConnectorIndex } from '../../../utils/indices';

import { IndexNameLogic } from '../index_name_logic';

import { IndexViewLogic } from '../index_view_logic';
import { SearchIndexTabId } from '../search_index';

import { ApiKeyConfig } from './api_key_configuration';
import { ConnectorConfigurationConfig } from './connector_configuration_config';
import { ConnectorNameAndDescription } from './connector_name_and_description/connector_name_and_description';
import { NativeConnectorConfiguration } from './native_connector_configuration/native_connector_configuration';

export const ConnectorConfiguration: React.FC = () => {
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);
  const { index, recheckIndexLoading } = useValues(IndexViewLogic);
  const { indexName } = useValues(IndexNameLogic);
  const { recheckIndex } = useActions(IndexViewLogic);
  if (!isConnectorIndex(index)) {
    return <></>;
  }

  if (index.connector.is_native && index.connector.service_type) {
    return <NativeConnectorConfiguration />;
  }

  const hasApiKey = !!(index.connector.api_key_id ?? apiKeyData);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiSteps
              steps={[
                {
                  children: (
                    <ApiKeyConfig indexName={indexName} hasApiKey={!!index.connector.api_key_id} />
                  ),
                  status: hasApiKey ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.generateApiKey.title',
                    {
                      defaultMessage: 'Generate an API key',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: <ConnectorNameAndDescription />,
                  status: index.connector.description ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.nameAndDescriptionTitle',
                    {
                      defaultMessage: 'Name and description',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <>
                      <EuiText size="s">
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.description.firstParagraph',
                          {
                            defaultMessage:
                              'The connectors repository contains several connector client examples to help you utilize our framework for accelerated development against custom data sources.',
                          }
                        )}
                      </EuiText>
                      <EuiLink href="https://github.com/elastic/connectors" target="_blank">
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.button.label',
                          {
                            defaultMessage: 'Explore the connectors repository',
                          }
                        )}
                      </EuiLink>
                      <EuiSpacer />
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.description.secondParagraph"
                          defaultMessage="The connectors repository contains several {link} to help you utilize our framework for accelerated development against custom data sources."
                          values={{
                            link: (
                              <EuiLink
                                href="https://github.com/elastic/connectors-ruby/tree/main/lib/connectors"
                                target="_blank"
                                external
                              >
                                {i18n.translate(
                                  'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.clientExamplesLink',
                                  { defaultMessage: 'connector client examples' }
                                )}
                              </EuiLink>
                            ),
                          }}
                        />
                      </EuiText>
                      <EuiSpacer />
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.description.thirdParagraph"
                          defaultMessage="In this step, you will need to clone or fork the repository, and copy the generated API key and connector ID to the associated {link}. The connector ID will identify this connector to Enterprise Search."
                          values={{
                            link: (
                              <EuiLink
                                href="https://github.com/elastic/connectors-ruby/tree/main/config"
                                target="_blank"
                                external
                              >
                                {i18n.translate(
                                  'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.configurationFileLink',
                                  { defaultMessage: 'configuration file' }
                                )}
                              </EuiLink>
                            ),
                          }}
                        />
                      </EuiText>
                      <EuiSpacer />
                      <EuiCodeBlock fontSize="m" paddingSize="m" color="dark" isCopyable>
                        {`${
                          apiKeyData?.encoded
                            ? `elasticsearch:
  api_key: "${apiKeyData?.encoded}"
`
                            : ''
                        }connector_id: "${index.connector.id}"
            `}
                      </EuiCodeBlock>
                      <EuiSpacer />
                      <EuiText size="s">
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.connectorDeployedText',
                          {
                            defaultMessage:
                              'Once you’ve configured the connector, deploy the connector to your self managed infrastructure.',
                          }
                        )}
                      </EuiText>
                    </>
                  ),
                  status:
                    !index.connector.status || index.connector.status === ConnectorStatus.CREATED
                      ? 'incomplete'
                      : 'complete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.deployConnector.title',
                    {
                      defaultMessage: 'Deploy a connector',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <ConnectorConfigurationConfig>
                      {!index.connector.status ||
                      index.connector.status === ConnectorStatus.CREATED ? (
                        <EuiCallOut
                          title={i18n.translate(
                            'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.waitingForConnectorTitle',
                            {
                              defaultMessage: 'Waiting for your connector',
                            }
                          )}
                          iconType="iInCircle"
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.waitingForConnectorText',
                            {
                              defaultMessage:
                                'Your connector has not connected to Enterprise Search. Troubleshoot your configuration and refresh the page.',
                            }
                          )}
                          <EuiSpacer size="s" />
                          <EuiButton
                            data-telemetry-id="entSearchContent-connector-configuration-recheckNow"
                            iconType="refresh"
                            onClick={() => recheckIndex()}
                            isLoading={recheckIndexLoading}
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.waitingForConnector.button.label',
                              {
                                defaultMessage: 'Recheck now',
                              }
                            )}
                          </EuiButton>
                        </EuiCallOut>
                      ) : (
                        <EuiCallOut
                          iconType="check"
                          color="success"
                          title={i18n.translate(
                            'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.connectorConnected',
                            {
                              defaultMessage:
                                'Your connector {name} has connected to Enterprise Search successfully.',
                              values: { name: index.connector.name },
                            }
                          )}
                        />
                      )}
                    </ConnectorConfigurationConfig>
                  ),
                  status:
                    index.connector.status === ConnectorStatus.CONNECTED
                      ? 'complete'
                      : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.enhance.title',
                    {
                      defaultMessage: 'Enhance your connector client',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <EuiFlexGroup direction="column">
                      <EuiFlexItem>
                        <EuiText size="s">
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.indices.configurationConnector.scheduleSync.description',
                            {
                              defaultMessage:
                                'Once your connectors are configured to your liking, don’t forget to set a recurring sync schedule to make sure your documents are indexed and relevant. You can also trigger a one-time sync without enabling a sync schedule.',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFlexGroup>
                          <EuiFlexItem grow={false}>
                            <EuiButtonTo
                              data-telemetry-id="entSearchContent-connector-configuration-setScheduleAndSync"
                              to={`${generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                                indexName,
                                tabId: SearchIndexTabId.SCHEDULING,
                              })}`}
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.indices.configurationConnector.steps.schedule.button.label',
                                {
                                  defaultMessage: 'Set schedule and sync',
                                }
                              )}
                            </EuiButtonTo>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                  status: index.connector.scheduling.enabled ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.schedule.title',
                    {
                      defaultMessage: 'Set a recurring sync schedule',
                    }
                  ),
                  titleSize: 'xs',
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder hasShadow={false}>
                <EuiFlexGroup direction="column">
                  <EuiFlexItem>
                    <EuiText>
                      <h4>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.support.title',
                          {
                            defaultMessage: 'Support and documentation',
                          }
                        )}
                      </h4>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.description',
                        {
                          defaultMessage:
                            'Your connector will have to be deployed to your own infrastructure.',
                        }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink href={docLinks.connectors} target="_blank">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.viewDocumentation.label',
                        {
                          defaultMessage: 'View documentation',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLinkTo to={'/app/management/security/api_keys'} shouldNotCreateHref>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.manageKeys.label',
                        {
                          defaultMessage: 'Manage keys',
                        }
                      )}
                    </EuiLinkTo>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink
                      href="https://github.com/elastic/connectors-ruby#readme"
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.readme.label',
                        {
                          defaultMessage: 'Connector readme',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink
                      href="https://discuss.elastic.co/c/enterprise-search/84"
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.getHelp.label',
                        {
                          defaultMessage: 'Get help',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink
                      href="https://github.com/elastic/connectors-ruby/issues"
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.issue.label',
                        {
                          defaultMessage: 'File an issue',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLinkTo to={'/app/integrations/browse'} shouldNotCreateHref>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.dontSeeIntegration.label',
                        {
                          defaultMessage: 'Don’t see the integration you’re looking for?',
                        }
                      )}
                    </EuiLinkTo>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink
                      href="https://docs.elastic.co/search-ui/tutorials/workplace-search"
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.searchUI.label',
                        {
                          defaultMessage: 'Use Search UI for Workplace Search',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink href="https://www.elastic.co/kibana/feedback" target="_blank">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.connectorFeedback.label',
                        {
                          defaultMessage: 'Connector feedback',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

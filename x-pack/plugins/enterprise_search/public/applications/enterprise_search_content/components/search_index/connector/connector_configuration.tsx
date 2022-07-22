/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ConnectorStatus } from '../../../../../../common/types/connectors';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { EuiButtonTo } from '../../../../shared/react_router_helpers';

import { GenerateConnectorApiKeyApiLogic } from '../../../api/connector_package/generate_connector_api_key_api_logic';
import { FetchIndexApiLogic } from '../../../api/index/fetch_index_api_logic';
import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { isConnectorIndex } from '../../../utils/indices';
import { ApiKey } from '../../api_key/api_key';

import { IndexNameLogic } from '../index_name_logic';

import { SearchIndexTabId } from '../search_index';

import { ApiKeyConfig } from './api_key_configuration';
import { ConnectorConfigurationConfig } from './connector_configuration_config';

export const ConnectorConfiguration: React.FC = () => {
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);
  const { data: indexData } = useValues(FetchIndexApiLogic);
  const { indexName } = useValues(IndexNameLogic);
  if (!isConnectorIndex(indexData)) {
    return <></>;
  }
  const indexId = indexData.connector.id ?? '';

  const hasApiKey = !!(indexData.connector.api_key_id ?? apiKeyData);

  const ConnectorConfig: React.FC = () => (
    <ConnectorConfigurationConfig
      apiKey={apiKeyData?.encoded}
      configuration={indexData.connector.configuration}
      connectorId={indexData.connector.id}
      indexId={indexId}
      indexName={indexName}
    />
  );

  const ScheduleStep: React.FC = () => (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.scheduleSync.description',
            {
              defaultMessage:
                'To start a sync you need to set a schedule. Once done your documents will begin to sync.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonTo
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
  );

  const ConnectorPackage: React.FC = () => (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.description',
            {
              defaultMessage: 'Used when configuring your connector package.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiLink href="https://github.com/elastic/connectors" target="_blank">
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.button.label',
                {
                  defaultMessage: 'Clone and deploy connector package',
                }
              )}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <ApiKey
          apiKey={indexId}
          label={i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.apiKey.label',
            {
              defaultMessage: 'Connector ID',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

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
                    <ApiKeyConfig
                      indexName={indexName}
                      hasApiKey={!!indexData.connector.api_key_id}
                    />
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
                  children: <ConnectorPackage />,
                  status:
                    !indexData.connector.status ||
                    indexData.connector.status === ConnectorStatus.CREATED
                      ? 'incomplete'
                      : 'complete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.deployConnector.title',
                    {
                      defaultMessage: 'Clone and deploy the repo',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: <ConnectorConfig />,
                  status:
                    indexData.connector.status === ConnectorStatus.CONNECTED
                      ? 'complete'
                      : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.connect.title',
                    {
                      defaultMessage: 'Connect your data source',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: <ScheduleStep />,
                  status: indexData.connector.scheduling.enabled ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.schedule.title',
                    {
                      defaultMessage: 'Set a schedule and start a sync',
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
                    <EuiLink
                      href="https://github.com/elastic/connectors/blob/main/README.md"
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.readme.label',
                        {
                          defaultMessage: 'Repository readme',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink href="TODO TODO TODO DOCLINK" target="_blank">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.documentation.label',
                        {
                          defaultMessage: 'Custom connector API documentation',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink href="https://www.elastic.co/kibana/feedback" target="_blank">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.feedback.label',
                        {
                          defaultMessage: 'Custom connector feedback',
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

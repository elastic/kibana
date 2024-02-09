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

import { ConnectorConfigurationComponent, ConnectorStatus } from '@kbn/search-connectors';

import { Status } from '../../../../../../common/types/api';

import { BetaConnectorCallout } from '../../../../shared/beta/beta_connector_callout';
import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../../shared/doc_links';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { HttpLogic } from '../../../../shared/http/http_logic';
import { LicensingLogic } from '../../../../shared/licensing';
import { EuiButtonTo, EuiLinkTo } from '../../../../shared/react_router_helpers';

import { GenerateConnectorApiKeyApiLogic } from '../../../api/connector/generate_connector_api_key_api_logic';
import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';
import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { isConnectorIndex } from '../../../utils/indices';

import { SyncsContextMenu } from '../components/header_actions/syncs_context_menu';
import { IndexNameLogic } from '../index_name_logic';

import { IndexViewLogic } from '../index_view_logic';
import { SearchIndexTabId } from '../search_index';

import { ApiKeyConfig } from './api_key_configuration';
import { ConnectorNameAndDescription } from './connector_name_and_description/connector_name_and_description';
import { BETA_CONNECTORS, CONNECTORS, getConnectorTemplate } from './constants';
import { NativeConnectorConfiguration } from './native_connector_configuration/native_connector_configuration';

export const ConnectorConfiguration: React.FC = () => {
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);
  const { index, recheckIndexLoading } = useValues(IndexViewLogic);
  const { indexName } = useValues(IndexNameLogic);
  const { recheckIndex } = useActions(IndexViewLogic);
  const cloudContext = useCloudDetails();
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { status } = useValues(ConnectorConfigurationApiLogic);
  const { makeRequest } = useActions(ConnectorConfigurationApiLogic);
  const { http } = useValues(HttpLogic);

  if (!isConnectorIndex(index)) {
    return <></>;
  }

  if (index.connector.is_native && index.connector.service_type) {
    return <NativeConnectorConfiguration />;
  }

  const hasApiKey = !!(index.connector.api_key_id ?? apiKeyData);
  const docsUrl = CONNECTORS.find(
    ({ serviceType }) => serviceType === index.connector.service_type
  )?.docsUrl;

  // TODO service_type === "" is considered unknown/custom connector multipleplaces replace all of them with a better solution
  const isBeta =
    !index.connector.service_type ||
    Boolean(
      BETA_CONNECTORS.find(({ serviceType }) => serviceType === index.connector.service_type)
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
                      hasApiKey={!!index.connector.api_key_id}
                      isNative={false}
                      secretId={null}
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
                        <FormattedMessage
                          id="xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.description.thirdParagraph"
                          defaultMessage="In this step, you will need to clone or fork the Elastic connectors repository, and copy the generated API key and connector ID to the associated {link}. The connector ID will identify this connector to Search. The service type will determine which type of data source the connector is configured for."
                          values={{
                            link: (
                              <EuiLink
                                href="https://github.com/elastic/connectors-python/blob/main/config.yml"
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
                        {getConnectorTemplate({
                          apiKeyData,
                          connectorData: {
                            id: index.connector.id,
                            service_type: index.connector.service_type,
                          },
                          host: cloudContext.elasticsearchUrl,
                        })}
                      </EuiCodeBlock>
                      <EuiSpacer />
                      <EuiText size="s">
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.connectorPackage.connectorDeployedText',
                          {
                            defaultMessage:
                              'Once configured, deploy the connector on your infrastructure.',
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
                      defaultMessage: 'Deploy connector service',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <ConnectorConfigurationComponent
                      connector={index.connector}
                      hasPlatinumLicense={hasPlatinumLicense}
                      isLoading={status === Status.LOADING}
                      saveConfig={(configuration) =>
                        makeRequest({
                          configuration,
                          connectorId: index.connector.id,
                          indexName: index.name,
                        })
                      }
                      subscriptionLink={docLinks.licenseManagement}
                      stackManagementLink={http.basePath.prepend(
                        '/app/management/stack/license_management'
                      )}
                    >
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
                                'Your connector has not connected to Search. Troubleshoot your configuration and refresh the page.',
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
                                'Your connector {name} has connected to Search successfully.',
                              values: { name: index.connector.name },
                            }
                          )}
                        />
                      )}
                    </ConnectorConfigurationComponent>
                  ),
                  status:
                    index.connector.status === ConnectorStatus.CONNECTED
                      ? 'complete'
                      : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.enhance.title',
                    {
                      defaultMessage: 'Configure your connector client',
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
                                'Finalize your connector by triggering a one-time sync, or setting a recurring sync to keep your data source in sync over time',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFlexGroup>
                          <EuiFlexItem grow={false}>
                            <EuiButtonTo
                              data-test-subj="entSearchContent-connector-configuration-setScheduleAndSync"
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
                          <EuiFlexItem grow={false}>
                            <SyncsContextMenu />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                  status: index.connector.scheduling.full.enabled ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.steps.schedule.title',
                    {
                      defaultMessage: 'Sync your data',
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
                            'You need to deploy this connector on your own infrastructure.',
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
                          defaultMessage: 'Manage API keys',
                        }
                      )}
                    </EuiLinkTo>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink
                      href="https://github.com/elastic/connectors-python/blob/main/README.md"
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
                  {docsUrl && (
                    <EuiFlexItem>
                      <EuiLink href={docsUrl} target="_blank">
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.support.dockerDeploy.label',
                          {
                            defaultMessage: 'Deploy with Docker',
                          }
                        )}
                      </EuiLink>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem>
                    <EuiLink
                      href="https://github.com/elastic/connectors-python/blob/main/docs/CONFIG.md#run-the-connector-service-for-a-custom-connector"
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.support.deploy.label',
                        {
                          defaultMessage: 'Deploy without Docker',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            {isBeta ? (
              <EuiFlexItem>
                <BetaConnectorCallout />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

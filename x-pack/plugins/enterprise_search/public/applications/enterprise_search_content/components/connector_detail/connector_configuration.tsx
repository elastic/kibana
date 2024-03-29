/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

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

import { Status } from '../../../../../common/types/api';
import { BetaConnectorCallout } from '../../../shared/beta/beta_connector_callout';
import { useCloudDetails } from '../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../shared/doc_links';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { LicensingLogic } from '../../../shared/licensing';
import { EuiButtonTo, EuiLinkTo } from '../../../shared/react_router_helpers';
import { GenerateConnectorApiKeyApiLogic } from '../../api/connector/generate_connector_api_key_api_logic';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../routes';
import { SyncsContextMenu } from '../search_index/components/header_actions/syncs_context_menu';
import { ApiKeyConfig } from '../search_index/connector/api_key_configuration';

import { getConnectorTemplate } from '../search_index/connector/constants';

import { AttachIndexBox } from './attach_index_box';
import { ConnectorDetailTabId } from './connector_detail';
import { ConnectorViewLogic } from './connector_view_logic';
import { NativeConnectorConfiguration } from './native_connector_configuration';

export const ConnectorConfiguration: React.FC = () => {
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);
  const { index, isLoading, connector, updateConnectorConfigurationStatus } =
    useValues(ConnectorViewLogic);
  const cloudContext = useCloudDetails();
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { errorConnectingMessage, http } = useValues(HttpLogic);

  const { connectorTypes } = useValues(KibanaLogic);
  const BETA_CONNECTORS = useMemo(
    () => connectorTypes.filter(({ isBeta }) => isBeta),
    [connectorTypes]
  );

  const { fetchConnector, updateConnectorConfiguration } = useActions(ConnectorViewLogic);

  if (!connector) {
    return <></>;
  }

  if (connector.is_native && connector.service_type) {
    return <NativeConnectorConfiguration />;
  }

  const hasApiKey = !!(connector.api_key_id ?? apiKeyData);
  const docsUrl = connectorTypes.find(
    ({ serviceType }) => serviceType === connector.service_type
  )?.docsUrl;

  const isBeta =
    !connector.service_type ||
    Boolean(BETA_CONNECTORS.find(({ serviceType }) => serviceType === connector.service_type));

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiSteps
              steps={[
                {
                  children: connector.index_name ? (
                    <ApiKeyConfig
                      indexName={connector.index_name}
                      hasApiKey={!!connector.api_key_id}
                      isNative={false}
                    />
                  ) : (
                    i18n.translate(
                      'xpack.enterpriseSearch.content.connectorDetail.configuration.apiKey.noApiKeyLabel',
                      {
                        defaultMessage: 'Please set an index name before generating an API key',
                      }
                    )
                  ),
                  status: hasApiKey ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.generateApiKey.title',
                    {
                      defaultMessage: 'Generate an API key',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <>
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.description.secondParagraph"
                          defaultMessage="The connectors repository contains several {link}. Use our framework to accelerate developing connectors for custom data sources."
                          values={{
                            link: (
                              <EuiLink
                                href="https://github.com/elastic/connectors-python/tree/main/connectors"
                                target="_blank"
                                external
                              >
                                {i18n.translate(
                                  'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.clientExamplesLink',
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
                          id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.description.thirdParagraph"
                          defaultMessage="In this step, you will need to clone or fork the repository, and copy the generated API key and connector ID to the associated {link}. The connector ID will identify this connector to Search. The service type will determine which type of data source the connector is configured for."
                          values={{
                            link: (
                              <EuiLink
                                href="https://github.com/elastic/connectors-python/blob/main/config.yml"
                                target="_blank"
                                external
                              >
                                {i18n.translate(
                                  'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.configurationFileLink',
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
                            id: connector.id,
                            service_type: connector.service_type,
                          },
                          host: cloudContext.elasticsearchUrl,
                        })}
                      </EuiCodeBlock>
                      <EuiSpacer />
                      <EuiText size="s">
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.connectorDeployedText',
                          {
                            defaultMessage:
                              'Once configured, deploy the connector on your infrastructure.',
                          }
                        )}
                      </EuiText>
                    </>
                  ),
                  status:
                    !connector.status || connector.status === ConnectorStatus.CREATED
                      ? 'incomplete'
                      : 'complete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.deployConnector.title',
                    {
                      defaultMessage: 'Deploy connector',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <ConnectorConfigurationComponent
                      connector={connector}
                      hasPlatinumLicense={hasPlatinumLicense}
                      isLoading={updateConnectorConfigurationStatus === Status.LOADING}
                      saveConfig={(configuration) =>
                        updateConnectorConfiguration({
                          configuration,
                          connectorId: connector.id,
                        })
                      }
                      subscriptionLink={docLinks.licenseManagement}
                      stackManagementLink={http.basePath.prepend(
                        '/app/management/stack/license_management'
                      )}
                    >
                      {!connector.status || connector.status === ConnectorStatus.CREATED ? (
                        <EuiCallOut
                          title={i18n.translate(
                            'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.waitingForConnectorTitle',
                            {
                              defaultMessage: 'Waiting for your connector',
                            }
                          )}
                          iconType="iInCircle"
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.waitingForConnectorText',
                            {
                              defaultMessage:
                                'Your connector has not connected to Search. Troubleshoot your configuration and refresh the page.',
                            }
                          )}
                          <EuiSpacer size="s" />
                          <EuiButton
                            disabled={!index}
                            data-telemetry-id="entSearchContent-connector-configuration-recheckNow"
                            iconType="refresh"
                            onClick={() => fetchConnector({ connectorId: connector.id })}
                            isLoading={isLoading}
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.waitingForConnector.button.label',
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
                            'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.connectorConnected',
                            {
                              defaultMessage:
                                'Your connector {name} has connected to Search successfully.',
                              values: { name: connector.name },
                            }
                          )}
                        />
                      )}
                    </ConnectorConfigurationComponent>
                  ),
                  status:
                    connector.status === ConnectorStatus.CONNECTED ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.enhance.title',
                    {
                      defaultMessage: 'Enhance your connector client',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <EuiFlexGroup direction="column">
                      {!connector.index_name && (
                        <EuiFlexItem>
                          <EuiCallOut
                            iconType="iInCircle"
                            color="danger"
                            title={i18n.translate(
                              'xpack.enterpriseSearch.content.connectors.configuration.connectorNoIndexCallOut.title',
                              {
                                defaultMessage: 'Connector has no attached index',
                              }
                            )}
                          >
                            <EuiSpacer size="s" />
                            <EuiText size="s">
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.connectors.configuration.connectorNoIndexCallOut.description',
                                {
                                  defaultMessage:
                                    "You won't be able to start syncing content until your connector is attached to an index.",
                                }
                              )}
                            </EuiText>
                            <EuiSpacer />
                          </EuiCallOut>
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem>
                        <EuiText size="s">
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.connector_detail.configurationConnector.scheduleSync.description',
                            {
                              defaultMessage:
                                'Finalize your connector by triggering a one-time sync, or setting a recurring sync to keep your data source in sync over time',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFlexGroup responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiButtonTo
                              data-test-subj="entSearchContent-connector-configuration-setScheduleAndSync"
                              data-telemetry-id="entSearchContent-connector-configuration-setScheduleAndSync"
                              isDisabled={
                                (connector?.is_native && !!errorConnectingMessage) ||
                                [
                                  ConnectorStatus.NEEDS_CONFIGURATION,
                                  ConnectorStatus.CREATED,
                                ].includes(connector?.status) ||
                                !connector?.index_name
                              }
                              to={`${generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                                connectorId: connector.id,
                                tabId: ConnectorDetailTabId.SCHEDULING,
                              })}`}
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.schedule.button.label',
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
                  status: connector.scheduling.full.enabled ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.schedule.title',
                    {
                      defaultMessage: 'Sync your data',
                    }
                  ),
                  titleSize: 'xs',
                },
              ]}
            />
          </EuiPanel>
          {
            <>
              <EuiSpacer />
              <AttachIndexBox connector={connector} />
            </>
          }
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
                          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.support.title',
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
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.support.description',
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
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.support.viewDocumentation.label',
                        {
                          defaultMessage: 'View documentation',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLinkTo to={'/app/management/security/api_keys'} shouldNotCreateHref>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.support.manageKeys.label',
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
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.support.readme.label',
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
                          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.support.dockerDeploy.label',
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
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.support.deploy.label',
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

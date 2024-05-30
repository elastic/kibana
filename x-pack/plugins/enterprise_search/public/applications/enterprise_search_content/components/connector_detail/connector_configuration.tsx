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

import { EXAMPLE_CONNECTOR_SERVICE_TYPES } from '../../../../../common/constants';

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
import { isAdvancedSyncRuleSnippetEmpty } from '../../utils/sync_rules_helpers';
import { SyncsContextMenu } from '../search_index/components/header_actions/syncs_context_menu';
import { ApiKeyConfig } from '../search_index/connector/api_key_configuration';

import { getConnectorTemplate } from '../search_index/connector/constants';

import { ConnectorFilteringLogic } from '../search_index/connector/sync_rules/connector_filtering_logic';

import { AttachIndexBox } from './attach_index_box';
import { ConnectorDetailTabId } from './connector_detail';
import { ConnectorViewLogic } from './connector_view_logic';
import { NativeConnectorConfiguration } from './native_connector_configuration';

export const ConnectorConfiguration: React.FC = () => {
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);
  const {
    index,
    isLoading,
    connector,
    updateConnectorConfigurationStatus,
    hasAdvancedFilteringFeature,
  } = useValues(ConnectorViewLogic);
  const cloudContext = useCloudDetails();
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { errorConnectingMessage, http } = useValues(HttpLogic);
  const { advancedSnippet } = useValues(ConnectorFilteringLogic);
  const isAdvancedSnippetEmpty = isAdvancedSyncRuleSnippetEmpty(advancedSnippet);

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

  const isBeta = Boolean(
    BETA_CONNECTORS.find(({ serviceType }) => serviceType === connector.service_type)
  );

  return (
    <>
      <EuiSpacer />
      {
        // TODO remove this callout when example status is removed
        connector &&
          connector.service_type &&
          EXAMPLE_CONNECTOR_SERVICE_TYPES.includes(connector.service_type) && (
            <>
              <EuiCallOut
                iconType="iInCircle"
                color="warning"
                title={i18n.translate(
                  'xpack.enterpriseSearch.content.connectors.overview.connectorUnsupportedCallOut.title',
                  {
                    defaultMessage: 'Example connector',
                  }
                )}
              >
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.connectors.overview.connectorUnsupportedCallOut.description"
                    defaultMessage="This is an example connector that serves as a building block for customizations. The design and code is being provided as-is with no warranties. This is not subject to the SLA of supported features."
                  />
                </EuiText>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )
      }
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            {
              <>
                <EuiSpacer />
                <AttachIndexBox connector={connector} />
              </>
            }
            {connector.index_name && (
              <>
                <EuiSpacer />
                <EuiSteps
                  steps={[
                    {
                      children: (
                        <ApiKeyConfig
                          indexName={connector.index_name}
                          hasApiKey={!!connector.api_key_id}
                          isNative={false}
                        />
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
                          <EuiSpacer />
                          <EuiText size="s">
                            <FormattedMessage
                              id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.description.thirdParagraph"
                              defaultMessage="In this step, you will need the API key and connector ID values for your config.yml file. Here's an {exampleLink}."
                              values={{
                                exampleLink: (
                                  <EuiLink
                                    data-test-subj="entSearchContent-connector-configuration-exampleConfigFileLink"
                                    data-telemetry-id="entSearchContent-connector-configuration-exampleConfigFileLink"
                                    href="https://github.com/elastic/connectors-python/blob/main/config.yml.example"
                                    target="_blank"
                                    external
                                  >
                                    {i18n.translate(
                                      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.configurationFileLink',
                                      { defaultMessage: 'example config file' }
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
                            <FormattedMessage
                              id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.description.fourthParagraph"
                              defaultMessage="Because this connector is self-managed, you need to deploy the connector service on your own infrastructure. You can build from source or use Docker. Refer to the {link} for your deployment options."
                              values={{
                                link: (
                                  <EuiLink
                                    data-test-subj="entSearchContent-connector-configuration-deploymentModeLink"
                                    data-telemetry-id="entSearchContent-connector-configuration-deploymentModeLink"
                                    href={docLinks.connectorsClientDeploy}
                                    target="_blank"
                                    external
                                  >
                                    {i18n.translate(
                                      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.deploymentModeLink',
                                      { defaultMessage: 'documentation' }
                                    )}
                                  </EuiLink>
                                ),
                              }}
                            />
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
                          defaultMessage: 'Set up and deploy connector',
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
                                data-test-subj="entSearchContent-connector-configuration-recheckNow"
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
                          <EuiSpacer size="s" />
                          {connector.status &&
                            hasAdvancedFilteringFeature &&
                            !isAdvancedSnippetEmpty && (
                              <EuiCallOut
                                title={i18n.translate(
                                  'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedRulesCallout',
                                  { defaultMessage: 'Configuration warning' }
                                )}
                                iconType="iInCircle"
                                color="warning"
                              >
                                <FormattedMessage
                                  id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedRulesCallout.description"
                                  defaultMessage="{advancedSyncRulesDocs} can override some configuration fields."
                                  values={{
                                    advancedSyncRulesDocs: (
                                      <EuiLink
                                        data-test-subj="entSearchContent-connector-configuration-advancedSyncRulesDocsLink"
                                        data-telemetry-id="entSearchContent-connector-configuration-advancedSyncRulesDocsLink"
                                        href={docLinks.syncRules}
                                        target="_blank"
                                      >
                                        {i18n.translate(
                                          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedSyncRulesDocs',
                                          { defaultMessage: 'Advanced Sync Rules' }
                                        )}
                                      </EuiLink>
                                    ),
                                  }}
                                />
                              </EuiCallOut>
                            )}
                        </ConnectorConfigurationComponent>
                      ),
                      status:
                        connector.status === ConnectorStatus.CONNECTED ? 'complete' : 'incomplete',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.enhance.title',
                        {
                          defaultMessage: 'Configure your connector',
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
              </>
            )}
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
                    <EuiLink
                      data-test-subj="entSearchContent-connector-configuration-connectorDocumentationLink"
                      data-telemetry-id="entSearchContent-connector-configuration-connectorDocumentationLink"
                      href={docLinks.connectors}
                      target="_blank"
                    >
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
                      data-test-subj="entSearchContent-connector-configuration-readmeLink"
                      data-telemetry-id="entSearchContent-connector-configuration-readmeLink"
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
                      <EuiLink
                        data-test-subj="entSearchContent-connector-configuration-deployWithDockerLink"
                        data-telemetry-id="entSearchContent-connector-configuration-deployWithDockerLink"
                        href={docsUrl}
                        target="_blank"
                      >
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
                      data-test-subj="entSearchContent-connector-configuration-deployWithoutDockerLink"
                      data-telemetry-id="entSearchContent-connector-configuration-deployWithoutDockerLink"
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

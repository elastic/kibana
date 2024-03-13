/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues } from 'kea';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { FeatureName } from '@kbn/search-connectors';

import { BetaConnectorCallout } from '../../../shared/beta/beta_connector_callout';
import { docLinks } from '../../../shared/doc_links';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';

import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { GenerateConnectorApiKeyApiLogic } from '../../api/connector/generate_connector_api_key_api_logic';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../routes';
import { hasConfiguredConfiguration } from '../../utils/has_configured_configuration';

import { SyncsContextMenu } from '../search_index/components/header_actions/syncs_context_menu';
import { ApiKeyConfig } from '../search_index/connector/api_key_configuration';
import { ConvertConnector } from '../search_index/connector/native_connector_configuration/convert_connector';
import { NativeConnectorConfigurationConfig } from '../search_index/connector/native_connector_configuration/native_connector_configuration_config';
import { ResearchConfiguration } from '../search_index/connector/native_connector_configuration/research_configuration';

import { AttachIndexBox } from './attach_index_box';
import { ConnectorDetailTabId } from './connector_detail';
import { ConnectorViewLogic } from './connector_view_logic';

export const NativeConnectorConfiguration: React.FC = () => {
  const { connector } = useValues(ConnectorViewLogic);
  const { config, connectorTypes: connectors } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);

  const NATIVE_CONNECTORS = useMemo(
    () => connectors.filter(({ isNative }) => isNative),
    [connectors]
  );
  const BETA_CONNECTORS = useMemo(() => connectors.filter(({ isBeta }) => isBeta), [connectors]);

  if (!connector) {
    return <></>;
  }

  const nativeConnector = NATIVE_CONNECTORS.find(
    (connectorDefinition) => connectorDefinition.serviceType === connector.service_type
  ) || {
    docsUrl: '',
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    iconPath: 'custom.svg',
    isBeta: true,
    isNative: true,
    keywords: [],
    name: connector.name,
    serviceType: connector.service_type ?? '',
  };

  const hasDescription = !!connector.description;
  const hasConfigured = hasConfiguredConfiguration(connector.configuration);
  const hasConfiguredAdvanced =
    connector.last_synced ||
    connector.scheduling.full.enabled ||
    connector.scheduling.incremental.enabled;
  const hasResearched = hasDescription || hasConfigured || hasConfiguredAdvanced;
  const iconPath = nativeConnector.iconPath;
  const hasDocumentLevelSecurity =
    connector.features?.[FeatureName.DOCUMENT_LEVEL_SECURITY]?.enabled || false;

  const hasApiKey = !!(connector.api_key_id ?? apiKeyData);

  // TODO service_type === "" is considered unknown/custom connector multipleplaces replace all of them with a better solution
  const isBeta =
    !connector.service_type ||
    Boolean(BETA_CONNECTORS.find(({ serviceType }) => serviceType === connector.service_type));

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiFlexGroup gutterSize="m" direction="row" alignItems="center">
              {iconPath && (
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xl" type={iconPath} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>{nativeConnector?.name ?? connector.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            {config.host && config.canDeployEntSearch && errorConnectingMessage && (
              <>
                <EuiCallOut
                  color="warning"
                  size="m"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.entSearchWarning.title',
                    {
                      defaultMessage: 'No running Enterprise Search instance detected',
                    }
                  )}
                  iconType="warning"
                >
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.entSearchWarning.text',
                      {
                        defaultMessage:
                          'Native connectors require a running Enterprise Search instance to sync content from source.',
                      }
                    )}
                  </p>
                </EuiCallOut>

                <EuiSpacer />
              </>
            )}
            <EuiSteps
              steps={[
                {
                  children: <ResearchConfiguration nativeConnector={nativeConnector} />,
                  status: hasResearched ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.researchConfigurationTitle',
                    {
                      defaultMessage: 'Research configuration requirements',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <NativeConnectorConfigurationConfig
                      connector={connector}
                      nativeConnector={nativeConnector}
                      status={connector.status}
                    />
                  ),
                  status: hasConfigured ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.configurationTitle',
                    {
                      defaultMessage: 'Configuration',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <ApiKeyConfig
                      indexName={connector.index_name || ''}
                      hasApiKey={hasApiKey}
                      isNative
                    />
                  ),
                  status: hasApiKey ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.manageApiKeyTitle',
                    {
                      defaultMessage: 'Manage API key',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <EuiFlexGroup direction="column">
                      <EuiFlexItem>
                        <EuiText size="s">
                          <FormattedMessage
                            id="xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnectorAdvancedConfiguration.description"
                            defaultMessage="Finalize your connector by triggering a one time sync, or setting a recurring sync schedule."
                          />
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFlexGroup responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiButtonTo
                              to={`${generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                                connectorId: connector.id,
                                tabId: ConnectorDetailTabId.SCHEDULING,
                              })}`}
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnectorAdvancedConfiguration.schedulingButtonLabel',
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
                  status: hasConfiguredAdvanced ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.advancedConfigurationTitle',
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
                <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="clock" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h3>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.schedulingReminder.title',
                          {
                            defaultMessage: 'Configurable sync schedule',
                          }
                        )}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.schedulingReminder.description',
                    {
                      defaultMessage:
                        'Remember to set a sync schedule in the Scheduling tab to continually refresh your searchable data.',
                    }
                  )}
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder hasShadow={false}>
                <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="globe" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h3>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.securityReminder.title',
                          {
                            defaultMessage: 'Document level security',
                          }
                        )}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                {hasDocumentLevelSecurity && (
                  <EuiText size="s">
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.securityReminder.description',
                      {
                        defaultMessage:
                          'Restrict and personalize the read access users have to the index documents at query time.',
                      }
                    )}
                    <EuiSpacer size="s" />
                    <EuiLink href={docLinks.documentLevelSecurity} target="_blank">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.securityReminder.securityLinkLabel',
                        {
                          defaultMessage: 'Document level security',
                        }
                      )}
                    </EuiLink>
                  </EuiText>
                )}
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder hasShadow={false}>
                <ConvertConnector />
              </EuiPanel>
            </EuiFlexItem>
            {isBeta ? (
              <EuiFlexItem grow={false}>
                <EuiPanel hasBorder hasShadow={false}>
                  <BetaConnectorCallout />
                </EuiPanel>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

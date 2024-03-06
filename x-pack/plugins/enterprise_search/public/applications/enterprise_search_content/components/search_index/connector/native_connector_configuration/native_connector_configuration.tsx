/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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

import { BetaConnectorCallout } from '../../../../../shared/beta/beta_connector_callout';
import { docLinks } from '../../../../../shared/doc_links';
import { HttpLogic } from '../../../../../shared/http';
import { CONNECTOR_ICONS } from '../../../../../shared/icons/connector_icons';
import { KibanaLogic } from '../../../../../shared/kibana';

import { GenerateConnectorApiKeyApiLogic } from '../../../../api/connector/generate_connector_api_key_api_logic';
import { hasConfiguredConfiguration } from '../../../../utils/has_configured_configuration';
import { isConnectorIndex } from '../../../../utils/indices';
import { IndexViewLogic } from '../../index_view_logic';
import { ApiKeyConfig } from '../api_key_configuration';
import { ConnectorNameAndDescription } from '../connector_name_and_description/connector_name_and_description';
import { BETA_CONNECTORS, NATIVE_CONNECTORS } from '../constants';

import { ConvertConnector } from './convert_connector';
import { NativeConnectorAdvancedConfiguration } from './native_connector_advanced_configuration';
import { NativeConnectorConfigurationConfig } from './native_connector_configuration_config';
import { ResearchConfiguration } from './research_configuration';

export const NativeConnectorConfiguration: React.FC = () => {
  const { index } = useValues(IndexViewLogic);
  const { config } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);

  if (!isConnectorIndex(index)) {
    return <></>;
  }

  const nativeConnector = NATIVE_CONNECTORS.find(
    (connector) => connector.serviceType === index.connector.service_type
  ) || {
    docsUrl: '',
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    icon: CONNECTOR_ICONS.custom,
    iconPath: 'custom.svg',
    isBeta: true,
    isNative: true,
    keywords: [],
    name: index.connector.name,
    serviceType: index.connector.service_type ?? '',
  };

  const hasDescription = !!index.connector.description;
  const hasConfigured = hasConfiguredConfiguration(index.connector.configuration);
  const hasConfiguredAdvanced =
    index.connector.last_synced ||
    index.connector.scheduling.full.enabled ||
    index.connector.scheduling.incremental.enabled;
  const hasResearched = hasDescription || hasConfigured || hasConfiguredAdvanced;
  const icon = nativeConnector.icon;

  const hasApiKey = !!(index.connector.api_key_id ?? apiKeyData);

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
            <EuiFlexGroup gutterSize="m" direction="row" alignItems="center">
              {icon && (
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xl" type={icon} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>{nativeConnector?.name ?? index.connector.name}</h2>
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
                    <ApiKeyConfig indexName={index.connector.name} hasApiKey={hasApiKey} isNative />
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
                  children: <ConnectorNameAndDescription />,
                  status: hasDescription ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.nameAndDescriptionTitle',
                    {
                      defaultMessage: 'Name and description',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <NativeConnectorConfigurationConfig
                      connector={index.connector}
                      nativeConnector={nativeConnector}
                      status={index.connector.status}
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
                  children: <NativeConnectorAdvancedConfiguration />,
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

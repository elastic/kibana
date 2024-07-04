/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues } from 'kea';

import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { BetaConnectorCallout } from '../../../shared/beta/beta_connector_callout';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';

import { GenerateConnectorApiKeyApiLogic } from '../../api/connector/generate_connector_api_key_api_logic';

import { ApiKeyConfig } from '../search_index/connector/api_key_configuration';
import { ConvertConnector } from '../search_index/connector/native_connector_configuration/convert_connector';
import { NativeConnectorConfigurationConfig } from '../search_index/connector/native_connector_configuration/native_connector_configuration_config';
import { ResearchConfiguration } from '../search_index/connector/native_connector_configuration/research_configuration';

import { AttachIndexBox } from './attach_index_box';
import { WhatsNextBox } from './components/whats_next_box';
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

  const iconPath = nativeConnector.iconPath;
  const hasApiKey = !!(connector.api_key_id ?? apiKeyData);

  // TODO service_type === "" is considered unknown/custom connector multipleplaces replace all of them with a better solution
  const isBeta =
    !connector.service_type ||
    Boolean(BETA_CONNECTORS.find(({ serviceType }) => serviceType === connector.service_type));

  return (
    <>
      {isBeta ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiPanel hasBorder hasShadow={false}>
              <BetaConnectorCallout />
            </EuiPanel>
          </EuiFlexItem>
          <EuiSpacer />
        </>
      ) : null}
      <EuiFlexGroup>
        <EuiFlexItem>
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
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {connector.is_native
                  ? i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.badgeType.nativeConnector',
                      { defaultMessage: 'Native connector' }
                    )
                  : i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.badgeType.connectorClient',
                      { defaultMessage: 'Connector client' }
                    )}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
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
          {
            <>
              <EuiSpacer />
              <AttachIndexBox connector={connector} />
            </>
          }
          {connector.index_name && (
            <>
              <EuiSpacer />
              <EuiPanel hasBorder>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.nativeConfigurationConnector.configuration.title',
                      { defaultMessage: 'Configuration' }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer />
                <ResearchConfiguration nativeConnector={nativeConnector} />
                <EuiSpacer size="m" />
                <NativeConnectorConfigurationConfig
                  connector={connector}
                  nativeConnector={nativeConnector}
                  status={connector.status}
                />
                <EuiSpacer />
              </EuiPanel>
              <EuiSpacer />
              <EuiPanel hasBorder>
                <EuiTitle size="s">
                  <h4>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.nativeConfigurationConnector.apiKey.title',
                      { defaultMessage: 'API Key' }
                    )}
                  </h4>
                </EuiTitle>
                <EuiSpacer size="m" />
                <ApiKeyConfig
                  indexName={connector.index_name || ''}
                  hasApiKey={hasApiKey}
                  isNative
                />
              </EuiPanel>
              <EuiSpacer />
              <EuiPanel hasBorder>
                <ConvertConnector />
              </EuiPanel>
              <EuiSpacer />
              <WhatsNextBox
                connectorId={connector.id}
                connectorStatus={connector.status}
                connectorIndex={connector.index_name}
              />
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

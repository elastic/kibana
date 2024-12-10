/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonLoading,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ConnectorConfigurationComponent, ConnectorStatus } from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';
import { docLinks } from '../../../shared/doc_links';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { LicensingLogic } from '../../../shared/licensing';
import { hasNonEmptyAdvancedSnippet, isExampleConnector } from '../../utils/connector_helpers';

import { ConnectorFilteringLogic } from '../search_index/connector/sync_rules/connector_filtering_logic';

import { IndexViewLogic } from '../search_index/index_view_logic';

import { AttachIndexBox } from './attach_index_box';
import { AdvancedConfigOverrideCallout } from './components/advanced_config_override_callout';
import { ConfigurationSkeleton } from './components/configuration_skeleton';
import { ExampleConfigCallout } from './components/example_config_callout';
import { WhatsNextBox } from './components/whats_next_box';
import { ConnectorViewLogic } from './connector_view_logic';
import { ConnectorDeployment } from './deployment';
import { NativeConnectorConfiguration } from './native_connector_configuration';

export const ConnectorConfiguration: React.FC = () => {
  const { connector, updateConnectorConfigurationStatus } = useValues(ConnectorViewLogic);
  const { connectorTypes: connectors } = useValues(KibanaLogic);
  const { isSyncing, isWaitingForSync } = useValues(IndexViewLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { http } = useValues(HttpLogic);
  const { advancedSnippet } = useValues(ConnectorFilteringLogic);

  const NATIVE_CONNECTORS = useMemo(
    () => connectors.filter(({ isNative }) => isNative),
    [connectors]
  );

  const { updateConnectorConfiguration } = useActions(ConnectorViewLogic);

  if (!connector) {
    return <></>;
  }

  if (connector.is_native && connector.service_type) {
    return <NativeConnectorConfiguration />;
  }

  const isWaitingForConnector = !connector.status || connector.status === ConnectorStatus.CREATED;

  const nativeConnector = NATIVE_CONNECTORS.find(
    (connectorDefinition) => connectorDefinition.serviceType === connector.service_type
  ) || {
    docsUrl: '',
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    iconPath: 'custom.svg',
    isBeta: true,
    isNative: false,
    keywords: [],
    name: connector.name,
    serviceType: connector.service_type ?? '',
  };

  const iconPath = nativeConnector.iconPath;

  return (
    <>
      {
        // TODO remove this callout when example status is removed
        isExampleConnector(connector) && <ExampleConfigCallout />
      }
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
                      { defaultMessage: 'Elastic managed connector' }
                    )
                  : i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.badgeType.connectorClient',
                      { defaultMessage: 'Self-managed connector' }
                    )}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <AttachIndexBox connector={connector} />
          <EuiSpacer />
          {connector.index_name && (
            <>
              <ConnectorDeployment />
              <EuiSpacer />
              <EuiPanel hasShadow={false} hasBorder>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.configuration.title',
                      { defaultMessage: 'Configuration' }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer />
                <EuiSkeletonLoading
                  isLoading={isWaitingForConnector}
                  loadingContent={<ConfigurationSkeleton />}
                  loadedContent={
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
                      <EuiSpacer size="s" />
                      {hasNonEmptyAdvancedSnippet(connector, advancedSnippet) && (
                        <AdvancedConfigOverrideCallout />
                      )}
                    </ConnectorConfigurationComponent>
                  }
                />
              </EuiPanel>
              <EuiSpacer />
              <WhatsNextBox
                connectorId={connector.id}
                disabled={isWaitingForConnector || !connector.last_synced}
                isWaitingForConnector={isWaitingForConnector}
                connectorIndex={connector.index_name}
                connectorStatus={connector.status}
                isSyncing={Boolean(isSyncing || isWaitingForSync)}
              />
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

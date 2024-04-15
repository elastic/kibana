/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiSpacer, EuiLink, EuiText, EuiFlexGroup, EuiFlexItem, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Connector, ConnectorStatus } from '@kbn/search-connectors';

import { ConnectorConfigurationComponent } from '@kbn/search-connectors/components/configuration/connector_configuration';

import { ConnectorDefinition } from '@kbn/search-connectors-plugin/common/types';

import { Status } from '../../../../../../../common/types/api';

import { docLinks } from '../../../../../shared/doc_links';
import { HttpLogic } from '../../../../../shared/http';
import { LicensingLogic } from '../../../../../shared/licensing';

import { ConnectorConfigurationApiLogic } from '../../../../api/connector/update_connector_configuration_api_logic';

interface NativeConnectorConfigurationConfigProps {
  connector: Connector;
  nativeConnector: ConnectorDefinition;
  status: ConnectorStatus;
}

export const NativeConnectorConfigurationConfig: React.FC<
  NativeConnectorConfigurationConfigProps
> = ({ connector, nativeConnector, status }) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { status: updateStatus } = useValues(ConnectorConfigurationApiLogic);
  const { makeRequest } = useActions(ConnectorConfigurationApiLogic);
  const { http } = useValues(HttpLogic);
  return (
    <ConnectorConfigurationComponent
      connector={connector}
      hasPlatinumLicense={hasPlatinumLicense}
      isLoading={updateStatus === Status.LOADING}
      saveConfig={(configuration) =>
        makeRequest({
          configuration,
          connectorId: connector.id,
        })
      }
      subscriptionLink={docLinks.licenseManagement}
      stackManagementLink={http.basePath.prepend('/app/management/stack/license_management')}
    >
      <EuiText size="s">
        {i18n.translate(
          'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.config.encryptionWarningMessage',
          {
            defaultMessage:
              'Encryption for data source credentials is unavailable in this version. Your data source credentials will be stored, unencrypted, in Elasticsearch.',
          }
        )}
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false}>
          <EuiLink href={docLinks.elasticsearchSecureCluster} target="_blank">
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.config.securityDocumentationLinkLabel',
              {
                defaultMessage: 'Learn more about Elasticsearch security',
              }
            )}
          </EuiLink>
        </EuiFlexItem>
        {nativeConnector.externalAuthDocsUrl && (
          <EuiFlexItem grow={false}>
            <EuiLink href={nativeConnector.externalAuthDocsUrl} target="_blank">
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.config.sourceSecurityDocumentationLinkLabel',
                {
                  defaultMessage: '{name} authentication',
                  values: {
                    name: nativeConnector.name,
                  },
                }
              )}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {status === ConnectorStatus.CONNECTED && (
        <>
          <EuiSpacer />
          <EuiCallOut
            iconType="check"
            color="success"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.connectorConnected',
              {
                defaultMessage: 'Your connector {name} has connected to Search successfully.',
                values: { name: nativeConnector.name },
              }
            )}
          />
        </>
      )}
    </ConnectorConfigurationComponent>
  );
};

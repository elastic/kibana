/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Connector, ConnectorConfigurationComponent } from '@kbn/search-connectors';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { docLinks } from '../../../../../common/doc_links';
import { useConnector } from '../../../hooks/api/use_connector';
import { useEditConnectorConfiguration } from '../../../hooks/api/use_connector_configuration';

interface ConnectorConfigFieldsProps {
  connector: Connector;
}

export const ConnectorConfigFields: React.FC<ConnectorConfigFieldsProps> = ({ connector }) => {
  const { data, isLoading, isSuccess, mutate, reset } = useEditConnectorConfiguration(connector.id);
  const { queryKey } = useConnector(connector.id);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isSuccess) {
      queryClient.setQueryData(queryKey, { connector: { ...connector, configuration: data } });
      queryClient.invalidateQueries(queryKey);
      reset();
    }
  }, [data, isSuccess, connector, queryClient, queryKey, reset]);
  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.serverlessSearch.connectors.config.connectorConfigTitle', {
              defaultMessage: 'Configure your connector',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          {i18n.translate('xpack.serverlessSearch.connectors.config.connectorConfigDescription', {
            defaultMessage:
              'Your connector is set up. Now you can enter access details for your data source. This ensures the connector can find content and is authorized to access it.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <ConnectorConfigurationComponent
          connector={connector}
          hasPlatinumLicense={false}
          isLoading={isLoading}
          saveConfig={mutate}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.serverlessSearch.searchConnectors.configurationConnector.config.documentation.description"
            defaultMessage="This connector supports several authentication methods. Ask your administrator for the correct connection credentials. {documentationUrl}"
            values={{
              documentationUrl: (
                <EuiLink
                  target="_blank"
                  data-test-subj="serverlessSearchConnectorConfigFieldsDocumentationLink"
                  href={docLinks.connectorClientAvailableConnectors}
                >
                  {i18n.translate(
                    'xpack.serverlessSearch.searchConnectors.configurationConnector.config.documentation.link',
                    {
                      defaultMessage: 'Documentation',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

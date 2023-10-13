/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectorConfiguration, ConnectorStatus } from '@kbn/search-connectors';
import React from 'react';

interface ConnectorConfigFieldsProps {
  configuration: ConnectorConfiguration;
  connectorId: string;
  status: ConnectorStatus;
}

export const ConnectorConfigFields: React.FC<ConnectorConfigFieldsProps> = ({
  configuration,
  connectorId,
}) => {
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
      <EuiFlexItem />
    </EuiFlexGroup>
  );
};

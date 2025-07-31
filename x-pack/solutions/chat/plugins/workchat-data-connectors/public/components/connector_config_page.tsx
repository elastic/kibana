/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiText, EuiSpacer, EuiBadge } from '@elastic/eui';

interface ConnectorConfigPageProps {
  connectorType: string;
  connectorName: string;
}

export const ConnectorConfigPage: React.FC<ConnectorConfigPageProps> = ({
  connectorType,
  connectorName,
}) => {
  return (
    <EuiPanel>
      <EuiTitle size="m">
        <h2>Connector Configuration</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiText>
        <p>
          <strong>Connector Name:</strong> {connectorName}
        </p>
        <p>
          <strong>Connector Type:</strong> <EuiBadge color="primary">{connectorType}</EuiBadge>
        </p>
        <p>This is a simple UI for configuring the {connectorName} connector.</p>
      </EuiText>
    </EuiPanel>
  );
};

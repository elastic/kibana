/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { ConnectorSelectorWithIcon } from './connector_selector_with_icon';
import * as i18n from './translations';

interface ConnectorActivePanelProps {
  connectors: AIConnector[];
  selectedConnectorId?: string;
  onConnectorSaved?: () => void;
  onConnectorSelected: (connector: AIConnector) => void;
}

export const ConnectorActivePanel = React.memo<ConnectorActivePanelProps>(
  ({ connectors, onConnectorSaved, selectedConnectorId, onConnectorSelected }) => {
    return (
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup
          style={{ height: '100%' }}
          alignItems="center"
          justifyContent="center"
          direction="column"
          gutterSize="s"
        >
          <EuiFlexItem grow={false} justifyContent="center">
            <EuiText>{i18n.SELECTED_PROVIDER}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem justifyContent="center">
            <ConnectorSelectorWithIcon
              selectedConnectorId={selectedConnectorId}
              connectors={connectors}
              onConnectorSelected={onConnectorSelected}
              onConnectorSaved={onConnectorSaved}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

ConnectorActivePanel.displayName = 'ConnectorActivePanel';

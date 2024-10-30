/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiLoadingSpinner,
  EuiText,
  EuiBadge,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useKibana } from '../../../../../../common/lib/kibana';
import { CreateConnectorPopover } from './create_connector_popover';
import { ConnectorSetup } from './connector_setup';

interface ConnectorCardsProps {
  connectors?: AIConnector[];
  onConnectorSaved: () => void;
}

export const ConnectorCards = React.memo<ConnectorCardsProps>(
  ({ connectors, onConnectorSaved }) => {
    const {
      triggersActionsUi: { actionTypeRegistry },
    } = useKibana().services;

    if (!connectors) return <EuiLoadingSpinner />;

    if (connectors.length > 0) {
      return (
        <>
          <EuiFlexGroup
            wrap
            className={css`
              max-height: 290px;
              overflow-y: auto;
            `}
          >
            {connectors.map((connector) => (
              <EuiFlexItem
                key={connector.id}
                grow={false}
                className={css`
                  width: 30%;
                `}
              >
                <EuiPanel hasShadow={false} hasBorder paddingSize="m">
                  <EuiFlexGroup direction="row" gutterSize="s" wrap>
                    <EuiFlexItem
                      className={css`
                        min-width: 100%;
                      `}
                    >
                      <EuiText size="s">{connector.name}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {actionTypeRegistry.get(connector.actionTypeId).actionTypeTitle}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer />
          <CreateConnectorPopover onConnectorSaved={onConnectorSaved} />
        </>
      );
    }

    return <ConnectorSetup onConnectorSaved={onConnectorSaved} />;
  }
);
ConnectorCards.displayName = 'ConnectorCards';

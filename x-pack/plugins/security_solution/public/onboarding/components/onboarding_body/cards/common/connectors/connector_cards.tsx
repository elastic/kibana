/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiLoadingSpinner,
  EuiText,
  EuiBadge,
  EuiSpacer,
  EuiCallOut,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useKibana } from '../../../../../../common/lib/kibana';
import {
  CreateConnectorPopover,
  type CreateConnectorPopoverProps,
} from './create_connector_popover';
import { ConnectorSetup } from './connector_setup';
import * as i18n from './translations';
import { MissingPrivilegesDescription } from './missing_privileges';

interface ConnectorCardsProps
  extends CreateConnectorPopoverProps,
    Omit<ConnectorListProps, 'connectors'> {
  connectors?: AIConnector[]; // make connectors optional to handle loading state
}

export const ConnectorCards = React.memo<ConnectorCardsProps>(
  ({
    connectors,
    onConnectorSaved,
    canCreateConnectors,
    selectedConnectorId,
    setSelectedConnectorId,
  }) => {
    if (!connectors) {
      return <EuiLoadingSpinner />;
    }

    const hasConnectors = connectors.length > 0;

    // show callout when user is missing actions.save privilege
    if (!hasConnectors && !canCreateConnectors) {
      return (
        <EuiCallOut title={i18n.PRIVILEGES_MISSING_TITLE} iconType="iInCircle">
          <MissingPrivilegesDescription />
        </EuiCallOut>
      );
    }

    return (
      <>
        {hasConnectors ? (
          <>
            <ConnectorList
              connectors={connectors}
              selectedConnectorId={selectedConnectorId}
              setSelectedConnectorId={setSelectedConnectorId}
            />
            <EuiSpacer />
            <CreateConnectorPopover
              canCreateConnectors={canCreateConnectors}
              onConnectorSaved={onConnectorSaved}
            />
          </>
        ) : (
          <ConnectorSetup onConnectorSaved={onConnectorSaved} />
        )}
      </>
    );
  }
);
ConnectorCards.displayName = 'ConnectorCards';

interface ConnectorListProps {
  connectors: AIConnector[];
  selectedConnectorId?: string | null;
  setSelectedConnectorId?: (id: string) => void;
}

const ConnectorList = React.memo<ConnectorListProps>(
  ({ connectors, selectedConnectorId, setSelectedConnectorId }) => {
    const { euiTheme } = useEuiTheme();
    const { actionTypeRegistry } = useKibana().services.triggersActionsUi;
    const onConnectorClick = useCallback(
      (id: string) => {
        setSelectedConnectorId?.(id);
      },
      [setSelectedConnectorId]
    );

    const selectedCss = `border: 2px solid ${euiTheme.colors.primary};`;

    return (
      <EuiFlexGroup
        wrap
        gutterSize="s"
        className={css`
          padding: ${euiTheme.size.s} 0;
          max-height: 350px;
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
            <EuiPanel
              hasShadow={false}
              hasBorder
              paddingSize="m"
              onClick={setSelectedConnectorId ? () => onConnectorClick(connector.id) : undefined}
              css={css`
                ${selectedConnectorId === connector.id ? selectedCss : ''}
              `}
              color={selectedConnectorId === connector.id ? 'primary' : 'plain'}
            >
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
    );
  }
);

ConnectorList.displayName = 'ConnectorList';

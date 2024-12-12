/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';
import { useQueryClient } from '@tanstack/react-query';
import { LOAD_CONNECTORS_QUERY_KEY } from '@kbn/elastic-assistant/impl/connectorland/use_load_connectors';
import * as i18n from './translations';
import { MissingPrivilegesDescription } from './missing_privileges';
import { ConnectorSetup } from './connector_setup';
import { ConnectorActivePanel } from './connector_active_panel';
import { useStoredAssistantConnectorId } from '../../../../hooks/use_stored_state';
import { useOnboardingContext } from '../../../../onboarding_context';

interface ConnectorCardsProps {
  onConnectorSaved: () => void;
  canCreateConnectors?: boolean;
  connectors?: AIConnector[]; // make connectors optional to handle loading state
  selectedConnectorId?: string;
  onConnectorSelected?: (connector: AIConnector) => void;
  onConnectorIdSelected?: (connectorId: string) => void;
}

export const ConnectorCards = React.memo<ConnectorCardsProps>(
  ({
    connectors,
    onConnectorSaved,
    canCreateConnectors,
    selectedConnectorId,
    onConnectorSelected,
    onConnectorIdSelected,
  }) => {
    const queryClient = useQueryClient();
    const { spaceId } = useOnboardingContext();
    const [, setStoredAssistantConnectorId] = useStoredAssistantConnectorId(spaceId);

    const onConnectorSaveWithQuery = useCallback(
      (newConnector: AIConnector) => {
        // refetch the connector selector items indirectly with the queryKey
        queryClient.invalidateQueries({ queryKey: LOAD_CONNECTORS_QUERY_KEY });
        // save the connectorId selected in LocalStorage
        setStoredAssistantConnectorId(newConnector.id);
        onConnectorSaved();
      },
      [onConnectorSaved, queryClient, setStoredAssistantConnectorId]
    );

    const onConnectorSelectedHandler = useCallback(
      (connector: AIConnector) => {
        onConnectorSelected?.(connector);
        onConnectorIdSelected?.(connector.id);
      },
      [onConnectorIdSelected, onConnectorSelected]
    );

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
        <EuiFlexGroup style={{ height: '160px' }}>
          {hasConnectors && (
            <EuiFlexItem>
              <ConnectorActivePanel
                selectedConnectorId={selectedConnectorId}
                onConnectorSaved={onConnectorSaved}
                connectors={connectors}
                onConnectorSelected={onConnectorSelectedHandler}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <ConnectorSetup onConnectorSaved={onConnectorSaveWithQuery} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);
ConnectorCards.displayName = 'ConnectorCards';

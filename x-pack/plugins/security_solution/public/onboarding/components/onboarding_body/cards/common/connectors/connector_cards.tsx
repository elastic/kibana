/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';
import type { AIConnector } from './types';
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
  onConnectorSelected: (connector: AIConnector) => void;
}

export const ConnectorCards = React.memo<ConnectorCardsProps>(
  ({
    connectors,
    onConnectorSaved,
    canCreateConnectors,
    selectedConnectorId,
    onConnectorSelected,
  }) => {
    const { spaceId } = useOnboardingContext();
    const [, setStoredAssistantConnectorId] = useStoredAssistantConnectorId(spaceId);

    const onConnectorSaveWithQuery = useCallback(
      (newConnector: AIConnector) => {
        setStoredAssistantConnectorId(newConnector.id);
        onConnectorSaved();
      },
      [onConnectorSaved, setStoredAssistantConnectorId]
    );

    const onConnectorSelectedHandler = useCallback(
      (connector: AIConnector) => {
        onConnectorSelected(connector);
      },
      [onConnectorSelected]
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
                connectors={connectors}
                onConnectorSelected={onConnectorSelectedHandler}
                onRefetchConnectors={onConnectorSaved}
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

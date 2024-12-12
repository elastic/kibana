/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@kbn/elastic-assistant/impl/connectorland/use_load_connectors';
import { type CreateConnectorPopoverProps } from './create_connector_popover';
import * as i18n from './translations';
import { MissingPrivilegesDescription } from './missing_privileges';
import { ConnectorSetup } from './connector_setup';
import type { ConnectorListProps } from './connector_panel';
import { ConnectorPanel } from './connector_panel';
import { useStoredAssistantConnectorId } from '../../../../hooks/use_stored_state';
import { useOnboardingContext } from '../../../../onboarding_context';

interface ConnectorCardsProps
  extends CreateConnectorPopoverProps,
    Omit<ConnectorListProps, 'connectors'> {
  connectors?: AIConnector[]; // make connectors optional to handle loading state
}

export const ConnectorCards = React.memo<ConnectorCardsProps>(
  ({ connectors, onConnectorSaved, canCreateConnectors }) => {
    // QUERY_KEY

    const queryClient = useQueryClient();
    const { spaceId } = useOnboardingContext();
    const [, setStoredAssistantConnectorId] = useStoredAssistantConnectorId(spaceId);

    const onConnectorSaveWithQuery = useCallback(
      (newConnector) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        console.log({ newConnector });
        setStoredAssistantConnectorId(newConnector.id);

        onConnectorSaved();
      },
      [onConnectorSaved, queryClient, setStoredAssistantConnectorId]
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
              <ConnectorPanel onConnectorSaved={onConnectorSaved} connectors={connectors} />
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

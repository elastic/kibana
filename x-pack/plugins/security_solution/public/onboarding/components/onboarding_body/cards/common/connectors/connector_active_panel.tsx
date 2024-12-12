/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { useAssistantContext, type Conversation } from '@kbn/elastic-assistant';
import { useCurrentConversation } from '@kbn/elastic-assistant/impl/assistant/use_current_conversation';
import { useDataStreamApis } from '@kbn/elastic-assistant/impl/assistant/use_data_stream_apis';
import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';

import { useKibana } from '../../../../../../common/lib/kibana';
import { useFilteredActionTypes } from './hooks/use_load_action_types';
import { ConnectorSelectorWithIcon } from './connector_selector_with_icon';

export interface ConnectorActivePanelProps {
  connectors: AIConnector[];
  onConnectorSaved?: () => void;
  selectedConnectorId?: string;
  setSelectedConnectorId: (connectorId: string) => void;
}

export const ConnectorActivePanel = React.memo<ConnectorActivePanelProps>(
  ({ connectors, onConnectorSaved, selectedConnectorId, setSelectedConnectorId }) => {
    const {
      http,
      notifications: { toasts },
    } = useKibana().services;

    const onConnectorIdSelected = useCallback(
      (connectorId: string) => {
        setSelectedConnectorId(connectorId);
      },
      [setSelectedConnectorId]
    );

    const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

    const { actionTypes } = useFilteredActionTypes(http, toasts);

    const {
      assistantAvailability: { isAssistantEnabled },
      baseConversations,
      getLastConversationId,
    } = useAssistantContext();
    const {
      allSystemPrompts,
      conversations,
      isFetchedCurrentUserConversations,
      isFetchedPrompts,
      refetchCurrentUserConversations,
    } = useDataStreamApis({ http, baseConversations, isAssistantEnabled });

    const { currentConversation, handleOnConversationSelected } = useCurrentConversation({
      allSystemPrompts,
      conversations,
      defaultConnector,
      refetchCurrentUserConversations,
      conversationId: getLastConversationId(),
      mayUpdateConversations:
        isFetchedCurrentUserConversations &&
        isFetchedPrompts &&
        Object.keys(conversations).length > 0,
    });

    const onConversationChange = useCallback(
      (updatedConversation: Conversation) => {
        handleOnConversationSelected({
          cId: updatedConversation.id,
          cTitle: updatedConversation.title,
        });
      },
      [handleOnConversationSelected]
    );

    if (!actionTypes) {
      return <EuiLoadingSpinner />;
    }

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
            <EuiText>{'Selected provider'}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem justifyContent="center">
            <ConnectorSelectorWithIcon
              selectedConnectorId={selectedConnectorId}
              selectedConversation={currentConversation}
              onConnectorSelected={onConversationChange}
              connectors={connectors}
              onConnectorSaved={onConnectorSaved}
              onConnectorIdSelected={onConnectorIdSelected}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

ConnectorActivePanel.displayName = 'ConnectorActivePanel';

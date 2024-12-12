/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { useAssistantContext, type Conversation } from '@kbn/elastic-assistant';
import { useCurrentConversation } from '@kbn/elastic-assistant/impl/assistant/use_current_conversation';
import { useDataStreamApis } from '@kbn/elastic-assistant/impl/assistant/use_data_stream_apis';
import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import { type ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { useStoredAssistantConnectorId } from '../../../../hooks/use_stored_state';
import { useOnboardingContext } from '../../../../onboarding_context';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFilteredActionTypes } from './hooks/use_load_action_types';
import { ConnectorSelectorAIAssistant } from './connector_selector_ai_assistant';
// import { ConnectorSetup } from './connector_setup';

export interface ConnectorListProps {
  connectors: AIConnector[];
  onConnectorSaved?: () => void;
}

export const ConnectorPanel = React.memo<ConnectorListProps>(({ connectors, onConnectorSaved }) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { spaceId } = useOnboardingContext();
  const [storedAssistantConnectorId, setStoredAssistantConnectorId] =
    useStoredAssistantConnectorId(spaceId);

  const [selectedConnectorId, setSelectedConnectorId] = useState(storedAssistantConnectorId);

  const onConnectorIdSelected = useCallback(
    (connectorId: string) => {
      setSelectedConnectorId(connectorId);
      setStoredAssistantConnectorId(connectorId);
    },
    [setStoredAssistantConnectorId]
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
      Object.keys(conversations).length > 0, // CHECK THIS
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
          <ConnectorSelectorAIAssistant
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
});

ConnectorPanel.displayName = 'ConnectorPanel';

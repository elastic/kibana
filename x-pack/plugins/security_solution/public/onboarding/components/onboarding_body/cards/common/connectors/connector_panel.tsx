/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { useAssistantContext, type Conversation } from '@kbn/elastic-assistant';
import { useCurrentConversation } from '@kbn/elastic-assistant/impl/assistant/use_current_conversation';
import { useDataStreamApis } from '@kbn/elastic-assistant/impl/assistant/use_data_stream_apis';
import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import { type ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFilteredActionTypes } from './hooks/use_load_action_types';
import { ConnectorSelectorAIAssistant } from './connector_selector_ai_assistant';
// import { ConnectorSetup } from './connector_setup';

export interface ConnectorListProps {
  connectors: AIConnector[];
  onConnectorSaved?: (savedAction: ActionConnector) => void;
  selectedConnectorId?: string; // | null;
  setSelectedConnectorId?: (id: string) => void;
}

export const ConnectorPanel = React.memo<ConnectorListProps>(
  ({ connectors, selectedConnectorId, setSelectedConnectorId, onConnectorSaved }) => {
    const {
      http,
      notifications: { toasts },
    } = useKibana().services;
    const onConnectorClick = useCallback(
      (id: string) => {
        setSelectedConnectorId?.(id);
      },
      [setSelectedConnectorId]
    );
    const [value] = useLocalStorage('assistant.selectedConnectorId');

    console.log({ value });

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

    // const handleOnConversationSelected = useCallback(
    //   async ({ cId, cTitle }: { cId: string; cTitle: string }) => {
    //     const allConversations = await refetchCurrentUserConversations();

    //     // This is a default conversation that has not yet been initialized
    //     // add the default connector config
    //     if (cId === '' && allConversations?.data?.[cTitle]) {
    //       const updatedConvo = await initializeDefaultConversationWithConnector(
    //         allConversations.data[cTitle]
    //       );
    //       setCurrentConversationId(updatedConvo.id);
    //     } else if (allConversations?.data?.[cId]) {
    //       setCurrentConversationId(cId);
    //     }
    //   },
    //   [
    //     initializeDefaultConversationWithConnector,
    //     refetchCurrentUserConversations,
    //     setCurrentConversationId,
    //   ]
    // );

    // could be removed
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
        if (updatedConversation.apiConfig) {
          onConnectorClick(updatedConversation.apiConfig?.connectorId);
        }
      },
      [handleOnConversationSelected, onConnectorClick]
    );

    // useEffect(() => {
    //   if (currentConversation) {
    //     onConversationChange(currentConversation);
    //   }
    // }, [currentConversation, onConversationChange]);

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
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

ConnectorPanel.displayName = 'ConnectorPanel';

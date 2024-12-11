/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { css } from '@emotion/css';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { type ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { useConversation } from '@kbn/elastic-assistant/impl/assistant/use_conversation';
import { getGenAiConfig } from '@kbn/elastic-assistant/impl/connectorland/helpers';
import { type Conversation } from '@kbn/elastic-assistant';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import { useFilteredActionTypes } from './hooks/use_load_action_types';
import { useKibana } from '../../../../../../common/lib/kibana';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';

interface Props {
  isDisabled?: boolean;
  selectedConnectorId?: string;
  selectedConversation?: Conversation;
  onConnectorIdSelected?: (connectorId: string) => void;
  onConnectorSelected?: (conversation: Conversation) => void;
  stats?: AttackDiscoveryStats | null;
  connectors: AIConnector[];
  onConnectorSaved?: (savedAction: ActionConnector) => void;
}

const inputContainerClassName = css`
  height: 32px;

  .euiSuperSelectControl {
    border: none;
    box-shadow: none;
    background: none;
    padding-left: 0;
  }

  .euiFormControlLayoutIcons {
    right: 14px;
    top: 2px;
  }
`;

const inputDisplayClassName = css`
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/**
 * A compact wrapper of the ConnectorSelector component used in the Settings modal.
 */
export const ConnectorSelectorAIAssistant = React.memo<Props>(
  ({
    isDisabled = false,
    selectedConnectorId,
    selectedConversation,
    onConnectorIdSelected,
    onConnectorSelected,
    connectors,
    onConnectorSaved,
    stats = null,
  }) => {
    const {
      http,
      triggersActionsUi: { actionTypeRegistry },
      notifications: { toasts },
    } = useKibana().services;
    const { euiTheme } = useEuiTheme();

    const { actionTypes } = useFilteredActionTypes(http, toasts);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { setApiConfig } = useConversation();

    const onChange = useCallback(
      async (connector: AIConnector) => {
        const connectorId = connector.id;
        if (connectorId === ADD_NEW_CONNECTOR) {
          return;
        }

        const config = getGenAiConfig(connector);
        const apiProvider = config?.apiProvider;
        const model = config?.defaultModel;
        setIsOpen(false);

        if (selectedConversation != null) {
          const conversation = await setApiConfig({
            conversation: selectedConversation,
            apiConfig: {
              ...selectedConversation.apiConfig,
              actionTypeId: connector.actionTypeId,
              connectorId,
              // With the inline component, prefer config args to handle 'new connector' case
              provider: apiProvider,
              model,
            },
          });

          if (conversation && onConnectorSelected != null) {
            onConnectorSelected(conversation);
          }
        }

        if (onConnectorIdSelected != null) {
          onConnectorIdSelected(connectorId);
        }
      },
      [selectedConversation, setApiConfig, onConnectorIdSelected, onConnectorSelected]
    );

    const selectedConnector = useMemo(
      () => connectors.find((connector) => connector.id === selectedConnectorId),
      [connectors, selectedConnectorId]
    );

    if (!actionTypes) {
      return <EuiLoadingSpinner />;
    }

    return (
      <EuiFlexGroup
        alignItems="center"
        className={inputContainerClassName}
        direction="column"
        justifyContent="center"
        responsive={false}
        gutterSize="xs"
      >
        {selectedConnector && (
          <EuiFlexItem grow={false}>
            <EuiIcon
              size="xxl"
              color="text"
              type={actionTypeRegistry.get(selectedConnector.actionTypeId).iconClass}
            />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <ConnectorSelector
            http={http}
            displayFancy={(displayText) => (
              <EuiText className={inputDisplayClassName} size="s" color={euiTheme.colors.primary}>
                {displayText}
              </EuiText>
            )}
            isOpen={isOpen}
            isDisabled={false}
            aiConnectors={connectors}
            selectedConnectorId={selectedConnectorId}
            setIsOpen={setIsOpen}
            onConnectorSelectionChange={onChange}
            postSaveConnectorEventHandler={onConnectorSaved}
            actionTypeRegistry={actionTypeRegistry}
            actionTypes={actionTypes}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConnectorSelectorAIAssistant.displayName = 'ConnectorSelectorAIAssistant';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle, EuiText, EuiSelect } from '@elastic/eui';
import { getDefaultConnector } from '@kbn/wc-genai-utils';
import { i18n } from '@kbn/i18n';
import { useAgentList } from '../../hooks/use_agent_list';
import { useNavigation } from '../../hooks/use_navigation';
import { useInitialMessage } from '../../context/initial_message_context';
import { useConnectors } from '../../hooks/use_connectors';
import { appPaths } from '../../app_paths';
import { ChatInputForm } from '../chat/chat_input_form';

export const HomeChatSection: React.FC = () => {
  const { agents } = useAgentList();
  const { connectors } = useConnectors();
  const { navigateToWorkchatUrl } = useNavigation();
  const { setInitialMessage } = useInitialMessage();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [connectorId, setConnectorId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (connectors.length && !connectorId) {
      const defaultConnector = getDefaultConnector({ connectors });
      if (defaultConnector) {
        setConnectorId(defaultConnector.connectorId);
      }
    }
  }, [connectorId, connectors]);

  const handleAgentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgentId(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    (message: string) => {
      if (selectedAgentId && connectorId) {
        setInitialMessage(message);
        navigateToWorkchatUrl(
          appPaths.chat.conversation({
            agentId: selectedAgentId,
            conversationId: 'new',
          })
        );
      }
    },
    [selectedAgentId, connectorId, setInitialMessage, navigateToWorkchatUrl]
  );

  const agentOptions = [
    {
      value: '',
      text: i18n.translate('workchatApp.home.selectAssistant', {
        defaultMessage: 'Select an assistant',
      }),
    },
    ...agents.map((agent) => ({
      value: agent.id,
      text: agent.name,
    })),
  ];

  return (
    <EuiFlexItem>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l">
        <EuiTitle size="s">
          <h2>
            {i18n.translate('workchatApp.home.welcomeTitle', {
              defaultMessage: 'How can we help you today?',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          {i18n.translate('workchatApp.home.selectAssistantPrompt', {
            defaultMessage: 'Select an assistant to start a conversation',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSelect
          options={agentOptions}
          value={selectedAgentId}
          onChange={handleAgentChange}
          aria-label={i18n.translate('workchatApp.home.selectAssistantAriaLabel', {
            defaultMessage: 'Select an assistant',
          })}
          fullWidth
        />
        <EuiSpacer size="l" />
        <ChatInputForm
          disabled={!selectedAgentId || !connectorId}
          loading={false}
          onSubmit={handleSubmit}
        />
      </EuiPanel>
    </EuiFlexItem>
  );
};

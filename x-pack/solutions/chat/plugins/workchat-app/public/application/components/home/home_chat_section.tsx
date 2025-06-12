/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiSuperSelect,
  EuiAvatar,
  useEuiTheme,
} from '@elastic/eui';
import { getDefaultConnector } from '@kbn/wc-genai-utils';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { useAgentList } from '../../hooks/use_agent_list';
import { useNavigation } from '../../hooks/use_navigation';
import { useInitialMessage } from '../../context/initial_message_context';
import { useConnectors } from '../../hooks/use_connectors';
import { appPaths } from '../../app_paths';
import { ChatInputForm } from '../chat/chat_input_form';

export const HomeChatSection: React.FC = () => {
  const { agents, isLoading: isAgentListLoading } = useAgentList();
  const { connectors } = useConnectors();
  const { navigateToWorkchatUrl } = useNavigation();
  const { setInitialMessage } = useInitialMessage();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [connectorId, setConnectorId] = useState<string | undefined>(undefined);

  const theme = useEuiTheme();

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (connectors.length && !connectorId) {
      const defaultConnector = getDefaultConnector({ connectors });
      if (defaultConnector) {
        setConnectorId(defaultConnector.connectorId);
      }
    }
  }, [connectorId, connectors]);

  const handleAgentChange = useCallback((value: string) => {
    setSelectedAgentId(value);
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

  const assistantSelectOptionClassName = css`
    padding: ${theme.euiTheme.size.xs} 0;
  `;

  const agentOptions = [
    ...agents.map((agent) => ({
      value: agent.id,
      inputDisplay: (
        <EuiFlexGroup gutterSize="s" alignItems="center" className={assistantSelectOptionClassName}>
          <EuiAvatar
            size="s"
            name={agent.name}
            initials={agent.avatar?.text}
            color={agent.avatar?.color}
          />
          <EuiText size="s">{agent.name}</EuiText>
        </EuiFlexGroup>
      ),
    })),
  ];

  return (
    <EuiFlexItem grow>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l" color="subdued">
        <EuiTitle size="s">
          <h2>
            {i18n.translate('workchatApp.home.welcomeWorkchat', {
              defaultMessage: 'Welcome to Workchat',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiTitle size="l">
          <h2>
            {i18n.translate('workchatApp.home.welcomeTitle', {
              defaultMessage: 'How can we help you today?',
            })}
          </h2>
        </EuiTitle>

        <EuiSpacer size="l" />
        <ChatInputForm
          disabled={!selectedAgentId || !connectorId}
          loading={false}
          onSubmit={handleSubmit}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
          <EuiText color="subdued" size="xs">
            {i18n.translate('workchatApp.home.selectAssistantLabel', {
              defaultMessage: 'Chatting with',
            })}
          </EuiText>
          <EuiSuperSelect
            isLoading={isAgentListLoading}
            options={agentOptions}
            valueOfSelected={selectedAgentId}
            onChange={handleAgentChange}
            placeholder={i18n.translate('workchatApp.home.selectAssistantPlaceholder', {
              defaultMessage: 'Select assistant',
            })}
            fullWidth
            hasDividers
          />
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};

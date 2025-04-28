/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiAvatar,
  EuiPanel,
  EuiText,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentList } from '../../hooks/use_agent_list';
import { useConversationList } from '../../hooks/use_conversation_list';
import { Agent } from '../../../../common/agents';
import { sortAndGroupConversations } from '../../utils/sort_and_group_conversations';
import { sliceRecentConversations } from '../../utils/slice_recent_conversations';
import { appPaths } from '../../app_paths';

const HOMEPAGE_CONVERSATION_HISTORY_LIMIT = 5;

export const HomeConversationHistorySection: React.FC<{}> = () => {
  const { navigateToWorkchatUrl } = useNavigation();
  const { agents, isLoading: isAgentsLoading } = useAgentList();
  const { conversations, isLoading: isConversationHistoryLoading } = useConversationList({});

  const agentMap = useMemo<Record<string, Agent>>(() => {
    return agents.reduce<Record<string, Agent>>((map, agent) => {
      map[agent.id] = agent;
      return map;
    }, {});
  }, [agents]);

  const conversationGroups = useMemo(() => {
    return sortAndGroupConversations(
      sliceRecentConversations(conversations, HOMEPAGE_CONVERSATION_HISTORY_LIMIT)
    );
  }, [conversations]);

  if (isAgentsLoading || isConversationHistoryLoading) {
    return;
  }

  const recentConversations = conversationGroups.map(
    ({ dateLabel, conversations: groupConversations }) => {
      const conversationItems = groupConversations.map((conversation) => {
        const agent = agentMap[conversation.agentId];
        if (!agent) {
          return null;
        }
        return (
          <EuiListGroupItem
            key={conversation.id}
            label={
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiAvatar
                    name={agent.name}
                    initials={agent.avatar.text}
                    color={agent.avatar.color}
                    size="s"
                  />
                </EuiFlexItem>
                <EuiFlexItem direction="column" grow={false}>
                  <EuiText size="s">{conversation.title}</EuiText>
                  <EuiText size="xs">{agent.name}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            onClick={() => {
              navigateToWorkchatUrl(
                appPaths.chat.conversation({
                  agentId: agent.id,
                  conversationId: conversation.id,
                })
              );
            }}
            size="s"
          />
        );
      });

      return (
        <EuiFlexItem grow={false} key={dateLabel}>
          <EuiPanel hasBorder={false} hasShadow={false} color="transparent" paddingSize="s">
            <EuiText size="s">
              <h4>{dateLabel}</h4>
            </EuiText>
          </EuiPanel>
          <EuiListGroup flush maxWidth={false} gutterSize="s">
            {conversationItems}
          </EuiListGroup>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      );
    }
  );

  return (
    <EuiFlexItem grow>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiIcon type="list" size="m" />
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('workchatApp.home.recentConversations.title', {
              defaultMessage: 'Recent conversations',
            })}
          </h4>
        </EuiTitle>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="s">
        {recentConversations}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

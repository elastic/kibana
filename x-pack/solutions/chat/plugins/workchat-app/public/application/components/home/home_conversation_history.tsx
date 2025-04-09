/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiLink,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiAvatar,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentList } from '../../hooks/use_agent_list';
import { useConversationList } from '../../hooks/use_conversation_list';
import { Agent } from '../../../../common/agents';
import { sortAndGroupConversations } from '../../utils/sort_and_group_conversations';
import { sliceRecentConversations } from '../../utils/slice_recent_conversations';
import { appPaths } from '../../app_paths';

export const HomeConversationHistorySection: React.FC<{}> = () => {
  const { navigateToWorkchatUrl } = useNavigation();
  const { agents } = useAgentList();
  const { conversations } = useConversationList({});

  const agentMap = useMemo<Record<string, Agent>>(() => {
    return agents.reduce<Record<string, Agent>>((map, agent) => {
      map[agent.id] = agent;
      return map;
    }, {});
  }, [agents]);

  const conversationGroups = useMemo(() => {
    return sortAndGroupConversations(sliceRecentConversations(conversations, 10));
  }, [conversations]);

  const recentConversations = conversationGroups.map(
    ({ conversations: groupConversations, dateLabel }) => {
      return (
        <EuiFlexItem grow={false} key={dateLabel}>
          <EuiPanel hasBorder={false} hasShadow={false} color="transparent" paddingSize="s">
            <EuiText size="s">
              <h4>{dateLabel}</h4>
            </EuiText>
          </EuiPanel>
          <EuiFlexGroup direction={'column'}>
            {groupConversations.map((conversation) => {
              const agent = agentMap[conversation.agentId];
              return (
                <EuiFlexItem key={conversation.id}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    {agent && (
                      <EuiFlexItem grow={false}>
                        <EuiAvatar name={agent.name} size="s" />
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem direction="column" grow={false}>
                      <EuiLink
                        onClick={() => {
                          navigateToWorkchatUrl(
                            appPaths.chat.conversation({
                              agentId: agent.id,
                              conversationId: conversation.id,
                            })
                          );
                        }}
                      >
                        {conversation.title}
                      </EuiLink>
                      <EuiText size="xs" onClick={() => {}}>
                        {agent.name}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      );
    }
  );

  return (
    <EuiFlexItem grow={false} style={{ maxWidth: 400 }}>
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

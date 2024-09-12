/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { AssistantSettingsManagement } from '@kbn/elastic-assistant/impl/assistant/settings/assistant_settings_management';
import type { Conversation } from '@kbn/elastic-assistant';
import {
  mergeBaseWithPersistedConversations,
  useAssistantContext,
  useFetchCurrentUserConversations,
  WELCOME_CONVERSATION_TITLE,
} from '@kbn/elastic-assistant';
import { useConversation } from '@kbn/elastic-assistant/impl/assistant/use_conversation';
import type { FetchConversationsResponse } from '@kbn/elastic-assistant/impl/assistant/api';
import { useQuery } from '@tanstack/react-query';
import type { UserAvatar } from '@kbn/elastic-assistant/impl/assistant_context';
import { useKibana } from '../../common/lib/kibana';

const defaultSelectedConversationId = WELCOME_CONVERSATION_TITLE;

export const ManagementSettings = React.memo(() => {
  const {
    baseConversations,
    http,
    assistantAvailability: { isAssistantEnabled },
    setCurrentUserAvatar,
  } = useAssistantContext();

  const {
    application: {
      navigateToApp,
      capabilities: {
        securitySolutionAssistant: { 'ai-assistant': securityAIAssistantEnabled },
      },
    },
    security,
    spaces,
  } = useKibana().services;

  const { spaceManager } = spaces?.ui.useSpaces();
  const { data: currentSpace } = useQuery({
    queryKey: ['currentSpace'],
    queryFn: () => spaceManager.getActiveSpace(),
    select: (data) => data,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  const { data: currentUserAvatar } = useQuery({
    queryKey: ['currentUserAvatar'],
    queryFn: () =>
      security?.userProfiles.getCurrent<{ avatar: UserAvatar }>({
        dataPath: 'avatar',
      }),
    select: (data) => {
      return data.data.avatar;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
  setCurrentUserAvatar(currentUserAvatar);

  const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> =>
      mergeBaseWithPersistedConversations(baseConversations, conversationsData),
    [baseConversations]
  );
  const { data: conversations } = useFetchCurrentUserConversations({
    http,
    onFetch: onFetchedConversations,
    isAssistantEnabled,
  });

  const { getDefaultConversation } = useConversation();

  const currentConversation = useMemo(
    () =>
      conversations?.[defaultSelectedConversationId] ??
      getDefaultConversation({ cTitle: WELCOME_CONVERSATION_TITLE }),
    [conversations, getDefaultConversation]
  );

  if (!securityAIAssistantEnabled) {
    navigateToApp('home');
  }

  if (conversations) {
    return <AssistantSettingsManagement selectedConversation={currentConversation} />;
  }

  return <></>;
});

ManagementSettings.displayName = 'ManagementSettings';

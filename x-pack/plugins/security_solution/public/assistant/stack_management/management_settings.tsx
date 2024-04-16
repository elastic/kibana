/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

export const ManagementSettings = React.memo(() => {
  const isFlyoutMode = useIsExperimentalFeatureEnabled('aiAssistantFlyoutMode');

  const {
    baseConversations,
    http,
    assistantAvailability: { isAssistantEnabled },
  } = useAssistantContext();

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

  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    WELCOME_CONVERSATION_TITLE
  );

  const { getDefaultConversation } = useConversation();

  const currentConversation = useMemo(
    () =>
      conversations?.[selectedConversationId] ??
      getDefaultConversation({ cTitle: WELCOME_CONVERSATION_TITLE, isFlyoutMode }),
    [conversations, getDefaultConversation, selectedConversationId, isFlyoutMode]
  );

  if (conversations) {
    return (
      <AssistantSettingsManagement
        selectedConversation={currentConversation}
        setSelectedConversationId={setSelectedConversationId}
        conversations={conversations}
        isFlyoutMode={isFlyoutMode}
      />
    );
  }

  return <></>;
});

ManagementSettings.displayName = 'ManagementSettings';

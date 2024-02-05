/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { AssistantSettingsManagement } from '@kbn/elastic-assistant/impl/assistant/settings/assistant_settings_management';
import { useAssistantContext, WELCOME_CONVERSATION_TITLE } from '@kbn/elastic-assistant';
import { useConversation } from '@kbn/elastic-assistant/impl/assistant/use_conversation';

export const ManagementSettings = React.memo(() => {
  const conversationId = WELCOME_CONVERSATION_TITLE;
  const {
    assistantAvailability: { isAssistantEnabled },
    conversations,
    getConversationId,
  } = useAssistantContext();
  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    isAssistantEnabled ? getConversationId(conversationId) : WELCOME_CONVERSATION_TITLE
  );

  const { createConversation } = useConversation();

  const currentConversation = useMemo(
    () =>
      conversations[selectedConversationId] ??
      createConversation({ conversationId: selectedConversationId }),
    [conversations, createConversation, selectedConversationId]
  );

  return (
    <AssistantSettingsManagement
      selectedConversation={currentConversation}
      setSelectedConversationId={setSelectedConversationId}
    />
  );
});

ManagementSettings.displayName = 'ManagementSettings';

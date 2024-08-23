/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React, { memo, useState, useEffect } from 'react';
import { useConversation } from '@kbn/elastic-assistant/impl/assistant/use_conversation';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Conversation } from '@kbn/elastic-assistant';
import { once } from 'lodash/fp';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useGetAssistantContext } from '../hooks/use_get_assistant_context';

/**
 * Displays the prompt history of the conversation
 */
export const PropmptHistory: VFC = memo(() => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const { getConversation } = useConversation();

  const { conversationId, isAssistantEnabled } = useGetAssistantContext();

  useEffect(() => {
    if (isAssistantEnabled) {
      const onLoad = once(async () => {
        const res = await getConversation(conversationId, true);
        if (res) {
          setConversation(res);
        }
      });
      onLoad();
    }
  }, [isAssistantEnabled, getConversation, conversationId]);

  if (!conversation) {
    return null;
  }
  const promptHistory = conversation.messages.filter((msg) => msg.role === 'user');

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.correlations.overviewTitle"
            defaultMessage="Prompt history"
          />
        ),
        iconType: 'discuss',
      }}
    >
      {promptHistory.map((prompt, index) => (
        <div key={index}>{prompt.content}</div>
      ))}
    </ExpandablePanel>
  );
});

PropmptHistory.displayName = 'PropmptHistory';

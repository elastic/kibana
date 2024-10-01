/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationView } from '@kbn/ai-assistant';
import { useSearchAIAssistantParams } from '../../../hooks/use_ai_assistant_params';
import { useSearchAIAssistantRouter } from '../../../hooks/use_ai_assistant_router';

export function ConversationViewWithProps() {
  const { path } = useSearchAIAssistantParams('/conversations/*');
  const conversationId = 'conversationId' in path ? path.conversationId : undefined;
  const searchAIAssistantRouter = useSearchAIAssistantRouter();
  function navigateToConversation(nextConversationId?: string) {
    if (nextConversationId) {
      searchAIAssistantRouter.push('/conversations/{conversationId}', {
        path: {
          conversationId: nextConversationId,
        },
        query: {},
      });
    } else {
      searchAIAssistantRouter.push('/conversations/new', { path: {}, query: {} });
    }
  }
  return (
    <ConversationView
      conversationId={conversationId}
      navigateToConversation={navigateToConversation}
      newConversationHref={searchAIAssistantRouter.link('/conversations/new')}
      getConversationHref={(id: string) =>
        searchAIAssistantRouter.link(`/conversations/{conversationId}`, {
          path: {
            conversationId: id,
          },
        })
      }
    />
  );
}

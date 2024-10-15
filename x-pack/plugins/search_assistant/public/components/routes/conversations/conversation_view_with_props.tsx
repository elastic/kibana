/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationView } from '@kbn/ai-assistant';
import { useParams } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function ConversationViewWithProps() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const {
    services: { application, http },
  } = useKibana();
  function navigateToConversation(nextConversationId?: string) {
    application?.navigateToUrl(
      http?.basePath.prepend(`/app/searchAssistant/conversations/${nextConversationId || ''}`) || ''
    );
  }
  return (
    <ConversationView
      conversationId={conversationId}
      navigateToConversation={navigateToConversation}
      newConversationHref={
        http?.basePath.prepend(`/app/searchAssistant/conversations/new|| ''}`) || ''
      }
      getConversationHref={(id: string) =>
        http?.basePath.prepend(`/app/searchAssistant/conversations/${id || ''}`) || ''
      }
      scope="search"
    />
  );
}

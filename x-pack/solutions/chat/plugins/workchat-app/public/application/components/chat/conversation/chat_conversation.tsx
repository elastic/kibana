/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { AuthenticatedUser } from '@kbn/core/public';
import type { ConversationEvent } from '../../../../../common/conversation_events';
import type { ProgressionEvent } from '../../../../../common/chat_events';
import { getConversationRounds } from '../../../utils/conversation_rounds';
import { WithFadeIn } from '../../utilities/fade_in';
import type { ChatStatus } from '../../../hooks/use_chat';
import { ChatConversationRound } from './conversation_round';

interface ChatConversationProps {
  conversationEvents: ConversationEvent[];
  progressionEvents: ProgressionEvent[];
  chatStatus: ChatStatus;
  currentUser: AuthenticatedUser | undefined;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  conversationEvents,
  progressionEvents,
  chatStatus,
}) => {
  const rounds = useMemo(() => {
    return getConversationRounds({ conversationEvents, progressionEvents, chatStatus });
  }, [conversationEvents, progressionEvents, chatStatus]);

  return (
    <>
      {rounds.map((round) => {
        return (
          <WithFadeIn key={round.userMessage.id}>
            <ChatConversationRound round={round} />
          </WithFadeIn>
        );
      })}
    </>
  );
};

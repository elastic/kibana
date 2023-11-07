/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import type { Conversation, Message } from '@kbn/elastic-assistant';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

import { AssistantAvatar } from '@kbn/elastic-assistant';
import { getMessageContentWithReplacements } from '../helpers';
import { StreamComment } from './stream';
import { CommentActions } from '../comment_actions';
import * as i18n from './translations';

export interface ContentMessage extends Message {
  content: string;
}
const transformMessageWithReplacements = ({
  message,
  content,
  showAnonymizedValues,
  replacements,
}: {
  message: Message;
  content: string;
  showAnonymizedValues: boolean;
  replacements?: Record<string, string>;
}): ContentMessage => {
  return {
    ...message,
    content:
      showAnonymizedValues || !replacements
        ? content
        : getMessageContentWithReplacements({
            messageContent: content,
            replacements,
          }),
  };
};

export const getComments = ({
  amendMessage,
  currentConversation,
  isFetchingResponse,
  regenerateMessage,
  showAnonymizedValues,
}: {
  amendMessage: ({ conversationId, content }: { conversationId: string; content: string }) => void;
  currentConversation: Conversation;
  isFetchingResponse: boolean;
  regenerateMessage: (conversationId: string) => void;
  showAnonymizedValues: boolean;
}): EuiCommentProps[] => {
  const amendMessageOfConversation = (content: string) => {
    amendMessage({
      conversationId: currentConversation.id,
      content,
    });
  };

  const regenerateMessageOfConversation = () => {
    regenerateMessage(currentConversation.id);
  };

  const extraLoadingComment = isFetchingResponse
    ? [
        {
          username: i18n.ASSISTANT,
          timelineAvatar: <EuiLoadingSpinner size="xl" />,
          timestamp: '...',
          children: (
            <StreamComment
              amendMessage={amendMessageOfConversation}
              content=""
              regenerateMessage={regenerateMessageOfConversation}
              isLastComment
              transformMessage={() => ({ content: '' } as unknown as ContentMessage)}
              isFetching
              // we never need to append to a code block in the loading comment, which is what this index is used for
              index={999}
            />
          ),
        },
      ]
    : [];

  return [
    ...currentConversation.messages.map((message, index) => {
      const isLastComment = index === currentConversation.messages.length - 1;
      const isUser = message.role === 'user';
      const replacements = currentConversation.replacements;

      const messageProps = {
        timelineAvatar: isUser ? (
          <EuiAvatar name="user" size="l" color="subdued" iconType="userAvatar" />
        ) : (
          <EuiAvatar name="machine" size="l" color="subdued" iconType={AssistantAvatar} />
        ),
        timestamp: i18n.AT(
          message.timestamp.length === 0 ? new Date().toLocaleString() : message.timestamp
        ),
        username: isUser ? i18n.YOU : i18n.ASSISTANT,
        eventColor: message.isError ? 'danger' : undefined,
      };

      const transformMessage = (content: string) =>
        transformMessageWithReplacements({
          message,
          content,
          showAnonymizedValues,
          replacements,
        });

      // message still needs to stream, no actions returned and replacements handled by streamer
      if (!(message.content && message.content.length)) {
        return {
          ...messageProps,
          children: (
            <StreamComment
              amendMessage={amendMessageOfConversation}
              index={index}
              isLastComment={isLastComment}
              isError={message.isError}
              reader={message.reader}
              regenerateMessage={regenerateMessageOfConversation}
              transformMessage={transformMessage}
            />
          ),
        };
      }

      // transform message here so we can send correct message to CommentActions
      const transformedMessage = transformMessage(message.content ?? '');

      return {
        ...messageProps,
        actions: <CommentActions message={transformedMessage} />,
        children: (
          <StreamComment
            amendMessage={amendMessageOfConversation}
            content={transformedMessage.content}
            index={index}
            isLastComment={isLastComment}
            // reader is used to determine if streaming controls are shown
            reader={transformedMessage.reader}
            regenerateMessage={regenerateMessageOfConversation}
            transformMessage={transformMessage}
          />
        ),
      };
    }),
    ...extraLoadingComment,
  ];
};

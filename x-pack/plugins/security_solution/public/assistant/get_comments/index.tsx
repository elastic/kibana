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
import type { Replacement } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
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
  replacements: Replacement[];
}): ContentMessage => {
  return {
    ...message,
    content: showAnonymizedValues
      ? content
      : replaceAnonymizedValuesWithOriginalValues({
          messageContent: content,
          replacements,
        }),
  };
};

export const getComments = ({
  abortStream,
  currentConversation,
  isEnabledLangChain,
  isFetchingResponse,
  refetchCurrentConversation,
  regenerateMessage,
  showAnonymizedValues,
}: {
  abortStream: () => void;
  currentConversation: Conversation;
  isEnabledLangChain: boolean;
  isFetchingResponse: boolean;
  refetchCurrentConversation: () => void;
  regenerateMessage: (conversationId: string) => void;
  showAnonymizedValues: boolean;
}): EuiCommentProps[] => {
  const regenerateMessageOfConversation = () => {
    regenerateMessage(currentConversation.id);
  };
  const connectorId = currentConversation.apiConfig?.connectorId ?? '';

  const extraLoadingComment = isFetchingResponse
    ? [
        {
          username: i18n.ASSISTANT,
          timelineAvatar: <EuiLoadingSpinner size="xl" />,
          timestamp: '...',
          children: (
            <StreamComment
              abortStream={abortStream}
              connectorId={connectorId}
              content=""
              refetchCurrentConversation={refetchCurrentConversation}
              regenerateMessage={regenerateMessageOfConversation}
              isEnabledLangChain={isEnabledLangChain}
              // TODO verify i dont need this?
              // isLastComment
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
          message.timestamp.length === 0
            ? new Date().toLocaleString()
            : new Date(message.timestamp).toLocaleString()
        ),
        username: isUser ? i18n.YOU : i18n.ASSISTANT,
        eventColor: message.isError ? 'danger' : undefined,
      };

      const isControlsEnabled = isLastComment && !isUser;

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
              abortStream={abortStream}
              connectorId={connectorId}
              index={index}
              isControlsEnabled={isControlsEnabled}
              isEnabledLangChain={isEnabledLangChain}
              // TODO verify i dont need this
              // isLastComment={isLastComment}
              isError={message.isError}
              reader={message.reader}
              refetchCurrentConversation={refetchCurrentConversation}
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
            connectorId={connectorId}
            abortStream={abortStream}
            content={transformedMessage.content}
            index={index}
            isControlsEnabled={isControlsEnabled}
            isEnabledLangChain={isEnabledLangChain}
            // TODO verify i dont need this?
            // isLastComment={isLastComment}
            // reader is used to determine if streaming controls are shown
            reader={transformedMessage.reader}
            regenerateMessage={regenerateMessageOfConversation}
            refetchCurrentConversation={refetchCurrentConversation}
            transformMessage={transformMessage}
          />
        ),
      };
    }),
    ...extraLoadingComment,
  ];
};

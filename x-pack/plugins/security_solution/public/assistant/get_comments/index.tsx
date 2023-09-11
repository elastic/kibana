/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import type { Conversation } from '@kbn/elastic-assistant';
import { EuiAvatar, EuiMarkdownFormat, EuiText } from '@elastic/eui';
import React from 'react';

import { AssistantAvatar } from '@kbn/elastic-assistant';
import { CommentActions } from '../comment_actions';
import * as i18n from './translations';

export const getComments = ({
  currentConversation,
  lastCommentRef,
  showAnonymizedValues,
}: {
  currentConversation: Conversation;
  lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
  showAnonymizedValues: boolean;
}): EuiCommentProps[] =>
  currentConversation.messages.map((message, index) => {
    const isUser = message.role === 'user';
    const replacements = currentConversation.replacements;
    const messageContentWithReplacements =
      replacements != null
        ? Object.keys(replacements).reduce(
            (acc, replacement) => acc.replaceAll(replacement, replacements[replacement]),
            message.content
          )
        : message.content;
    const transformedMessage = {
      ...message,
      content: messageContentWithReplacements,
    };

    return {
      actions: <CommentActions message={transformedMessage} />,
      children:
        index !== currentConversation.messages.length - 1 ? (
          <EuiText>
            <EuiMarkdownFormat className={`message-${index}`}>
              {showAnonymizedValues ? message.content : transformedMessage.content}
            </EuiMarkdownFormat>
          </EuiText>
        ) : (
          <EuiText>
            <EuiMarkdownFormat className={`message-${index}`}>
              {showAnonymizedValues ? message.content : transformedMessage.content}
            </EuiMarkdownFormat>
            <span ref={lastCommentRef} />
          </EuiText>
        ),
      timelineAvatar: isUser ? (
        <EuiAvatar name="user" size="l" color="subdued" iconType="userAvatar" />
      ) : (
        <EuiAvatar name="machine" size="l" color="subdued" iconType={AssistantAvatar} />
      ),
      timestamp: i18n.AT(
        message.timestamp.length === 0 ? new Date().toLocaleString() : message.timestamp
      ),
      username: isUser ? i18n.YOU : i18n.ASSISTANT,
    };
  });

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

import { CommentActions } from '../comment_actions';
import * as i18n from './translations';

export const getComments = ({
  currentConversation,
  lastCommentRef,
}: {
  currentConversation: Conversation;
  lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
}): EuiCommentProps[] =>
  currentConversation.messages.map((message, index) => {
    const isUser = message.role === 'user';

    return {
      actions: <CommentActions message={message} />,
      children:
        index !== currentConversation.messages.length - 1 ? (
          <EuiText>
            <EuiMarkdownFormat className={`message-${index}`}>{message.content}</EuiMarkdownFormat>
          </EuiText>
        ) : (
          <EuiText>
            <EuiMarkdownFormat className={`message-${index}`}>{message.content}</EuiMarkdownFormat>
            <span ref={lastCommentRef} />
          </EuiText>
        ),
      timelineAvatar: isUser ? (
        <EuiAvatar name="user" size="l" color="subdued" iconType="userAvatar" />
      ) : (
        <EuiAvatar name="machine" size="l" color="subdued" iconType="logoSecurity" />
      ),
      timestamp: i18n.AT(message.timestamp),
      username: isUser ? i18n.YOU : i18n.ASSISTANT,
    };
  });

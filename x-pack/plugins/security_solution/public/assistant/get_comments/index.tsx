/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import type { Conversation } from '@kbn/elastic-assistant';
import { EuiAvatar, EuiMarkdownFormat, EuiText, tint } from '@elastic/eui';
import React from 'react';

import { AssistantAvatar } from '@kbn/elastic-assistant';
import { css } from '@emotion/react/dist/emotion-react.cjs';
import { euiThemeVars } from '@kbn/ui-theme';
import type { EuiPanelProps } from '@elastic/eui/src/components/panel';
import { StreamComment } from './stream_obs';
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
    const errorStyles = {
      eventColor: 'danger' as EuiPanelProps['color'],
      css: css`
        .euiCommentEvent {
          border: 1px solid ${tint(euiThemeVars.euiColorDanger, 0.75)};
        }
        .euiCommentEvent__header {
          padding: 0 !important;
          border-block-end: 1px solid ${tint(euiThemeVars.euiColorDanger, 0.75)};
        }
      `,
    };

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
      ...(message.isError ? errorStyles : {}),
    };

    if (message.content && message.content.length) {
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
        ...messageProps,
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
      };
    }
    if (message.reader) {
      return {
        ...messageProps,
        children: (
          <StreamComment
            reader={message.reader}
            index={index}
            lastCommentRef={lastCommentRef}
            isLastComment={index === currentConversation.messages.length - 1}
          />
        ),
      };
    }
    return {
      ...messageProps,
      children: <EuiText>{'oh no an error happened'}</EuiText>,
      ...errorStyles,
    };
  });

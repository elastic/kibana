/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import type { Conversation, Message } from '@kbn/elastic-assistant';
import { EuiAvatar, tint } from '@elastic/eui';
import React from 'react';

import { AssistantAvatar } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import type { EuiPanelProps } from '@elastic/eui/src/components/panel';
import { StreamComment } from './stream';
import { CommentActions } from '../comment_actions';
import * as i18n from './translations';
import { customCodeBlockLanguagePlugin } from './custom_codeblock/custom_codeblock_markdown_plugin';
import { CustomCodeBlock } from './custom_codeblock/custom_code_block';

export const getComments = ({
  amendMessage,
  currentConversation,
  lastCommentRef,
  regenerateMessage,
  showAnonymizedValues,
}: {
  amendMessage: ({
    conversationId,
    content,
  }: {
    conversationId: string;
    content: string;
  }) => Message[];
  currentConversation: Conversation;
  lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
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

  return currentConversation.messages.map((message, index) => {
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
    const isLastComment = index === currentConversation.messages.length - 1;

    // message still needs to stream, no response manipulation
    if (!(message.content && message.content.length)) {
      return {
        ...messageProps,
        children: (
          <>
            <StreamComment
              amendMessage={amendMessageOfConversation}
              reader={message.reader}
              regenerateMessage={regenerateMessageOfConversation}
              isLastComment={isLastComment}
            />
            {isLastComment ? <span ref={lastCommentRef} /> : null}
          </>
        ),
      };
    }

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
      children: (
        <>
          <StreamComment
            amendMessage={amendMessageOfConversation}
            content={showAnonymizedValues ? message.content : transformedMessage.content}
            reader={message.reader}
            regenerateMessage={regenerateMessageOfConversation}
            isLastComment={isLastComment}
          />
          {isLastComment ? <span ref={lastCommentRef} /> : null}
        </>
      ),
    };
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiComment } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { MessageRole, Message } from '../../../common/types';
import { ChatItemAvatar } from './chat_item_avatar';
import { ChatItemTitle } from './chat_item_title';

const roleMap = {
  [MessageRole.User]: i18n.translate(
    'xpack.observabilityAiAssistant.chatTimeline.messages.userLabel',
    { defaultMessage: 'You' }
  ),
  [MessageRole.System]: i18n.translate(
    'xpack.observabilityAiAssistant.chatTimeline.messages.systemLabel',
    { defaultMessage: 'System' }
  ),
  [MessageRole.Assistant]: i18n.translate(
    'xpack.observabilityAiAssistant.chatTimeline.messages.assistantLabel',
    { defaultMessage: 'Elastic Assistant' }
  ),
  [MessageRole.Function]: i18n.translate(
    'xpack.observabilityAiAssistant.chatTimeline.messages.functionLabel',
    { defaultMessage: 'Elastic Assistant' }
  ),
  [MessageRole.Event]: i18n.translate(
    'xpack.observabilityAiAssistant.chatTimeline.messages.functionLabel',
    { defaultMessage: 'Elastic Assistant' }
  ),
  [MessageRole.Elastic]: i18n.translate(
    'xpack.observabilityAiAssistant.chatTimeline.messages.functionLabel',
    { defaultMessage: 'Elastic Assistant' }
  ),
};

export interface ChatItemProps {
  currentUser: AuthenticatedUser | undefined;
  dateFormat: string;
  index: number;
  message: Message;
}

export function ChatItem({ currentUser, dateFormat, index, message }: ChatItemProps) {
  return (
    <EuiComment
      key={message['@timestamp']}
      event={<ChatItemTitle message={message} index={index} dateFormat={dateFormat} />}
      timelineAvatar={<ChatItemAvatar currentUser={currentUser} role={message.message.role} />}
      username={roleMap[message.message.role]}
    >
      {message.message.content ? (
        <EuiText size="s">
          <p>{message.message.content}</p>
        </EuiText>
      ) : null}
    </EuiComment>
  );
}

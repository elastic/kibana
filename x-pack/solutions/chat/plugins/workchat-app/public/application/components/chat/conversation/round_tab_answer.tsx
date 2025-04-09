/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { css } from '@emotion/css';
import {
  EuiPanel,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiHealth,
  EuiAvatar,
  EuiSkeletonText,
  EuiTabs,
  EuiTab,
  useEuiFontSize,
} from '@elastic/eui';
import { type ConversationRound } from '../../../utils/conversation_items';
import { ChatMessageText } from './chat_message_text';

interface RoundTabAnswerProps {
  round: ConversationRound;
}

export const RoundTabAnswer: React.FC<RoundTabAnswerProps> = ({ round }) => {
  const { euiTheme } = useEuiTheme();

  const { assistantMessage, loading } = round;

  return (
    <div>
      <ChatMessageText content={assistantMessage?.content ?? ''} loading={loading} />
    </div>
  );
};

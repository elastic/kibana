/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiComment,
  EuiCommentList,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { GenAiMessage } from './get_genai_fields';
import { GenAiMessageContent } from './genai_message_content';

function RoleAvatar({ role }: { role: string }) {
  const { euiTheme } = useEuiTheme();
  const colorByRole: Record<string, string> = {
    system: euiTheme.colors.warning,
    user: euiTheme.colors.primary,
    assistant: euiTheme.colors.success,
    tool: euiTheme.colors.accent,
    function: euiTheme.colors.accent,
  };
  const color = colorByRole[role.toLowerCase()] ?? euiTheme.colors.lightShade;
  return (
    <EuiAvatar
      name={role}
      color={color}
      size="m"
      data-test-subj={`genAiRoleBadge-${role}`}
    />
  );
}

interface Props {
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
  systemInstructions?: string;
}

export function GenAiMessages({ inputMessages, outputMessages, systemInstructions }: Props) {
  const allMessages: GenAiMessage[] = [
    ...(systemInstructions ? [{ role: 'system', content: systemInstructions }] : []),
    ...inputMessages,
    ...outputMessages,
  ];

  if (allMessages.length === 0) return null;

  return (
    <>
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.apm.genAi.messages.title', {
            defaultMessage: 'Conversation',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCommentList aria-label="GenAI conversation">
        {allMessages.map((msg, i) => (
          <EuiComment
            key={i}
            username={msg.role}
            timelineAvatar={<RoleAvatar role={msg.role} />}
            timelineAvatarAriaLabel={msg.role}
            data-test-subj={`genAiMessage-${i}`}
          >
            <EuiText size="s">
              <GenAiMessageContent message={msg} />
            </EuiText>
          </EuiComment>
        ))}
      </EuiCommentList>
    </>
  );
}

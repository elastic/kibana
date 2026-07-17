/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
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

function roleColor(role: string): string {
  switch (role.toLowerCase()) {
    case 'system':
      return 'warning';
    case 'user':
      return 'primary';
    case 'assistant':
      return 'success';
    case 'tool':
    case 'function':
      return 'accent';
    default:
      return 'hollow';
  }
}

function RoleBadge({ role }: { role: string }) {
  return (
    <EuiBadge color={roleColor(role)} data-test-subj={`genAiRoleBadge-${role}`}>
      {role}
    </EuiBadge>
  );
}

interface Props {
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
  systemInstructions?: string;
}

export function GenAiMessages({ inputMessages, outputMessages, systemInstructions }: Props) {
  const { euiTheme } = useEuiTheme();

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
            username={<RoleBadge role={msg.role} />}
            timelineAvatarAriaLabel={msg.role}
            data-test-subj={`genAiMessage-${i}`}
            style={{ borderLeft: `2px solid ${euiTheme.colors.lightShade}` }}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiComment, EuiCommentList, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import type { GenAiMessage } from './get_genai_fields';
import { GenAiMessageContent } from './genai_message_content';

/**
 * Fixed-size role avatar using EUI semantic background tokens so the circle
 * is always the same size regardless of the role label length — keeping all
 * message bodies aligned in a consistent column.
 */
function RoleAvatar({ role }: { role: string }) {
  const { euiTheme } = useEuiTheme();

  // Semantic "light" background tokens — soft pastels that work in both
  // light and dark mode and match EUI's own status-color system.
  const colorByRole: Record<string, string> = {
    system: euiTheme.colors.backgroundLightWarning,
    user: euiTheme.colors.backgroundLightPrimary,
    assistant: euiTheme.colors.backgroundLightSuccess,
    tool: euiTheme.colors.backgroundLightAccent,
    function: euiTheme.colors.backgroundLightAccent,
  };
  const color = colorByRole[role.toLowerCase()] ?? euiTheme.colors.backgroundBaseSubdued;

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
  );
}

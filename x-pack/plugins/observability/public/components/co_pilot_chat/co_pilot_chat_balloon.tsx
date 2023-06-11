/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface Props {
  role: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
}

export function CoPilotChatBalloon({ role, children }: Props) {
  const theme = useEuiTheme();

  return (
    <div
      css={css`
        width: 80%;
        background-color: ${role === 'user'
          ? theme.euiTheme.colors.primaryText
          : theme.euiTheme.colors.body};
        color: ${role === 'user'
          ? theme.euiTheme.colors.lightestShade
          : theme.euiTheme.colors.text};
        align-self: ${role === 'user' ? 'flex-start' : 'flex-end'};
        line-height: 1.5;
        border-radius: ${theme.euiTheme.border.radius.medium};
        padding: ${theme.euiTheme.size.m};
        white-space: pre-wrap;
      `}
    >
      {children}
    </div>
  );
}

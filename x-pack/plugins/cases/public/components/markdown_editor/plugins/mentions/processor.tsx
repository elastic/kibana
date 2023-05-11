/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import type { EuiMarkdownAstNodePosition } from '@elastic/eui';
import { EuiText, EuiToolTip, EuiAvatar, useEuiTheme } from '@elastic/eui';
import type { MentionsNodeDetails } from './types';
import { useGetUsers } from './use_get_users';

export const mentionsMarkdownRendererComponent: FunctionComponent<
  MentionsNodeDetails & {
    position: EuiMarkdownAstNodePosition;
  }
> = ({ mention }) => {
  const { euiTheme } = useEuiTheme();
  const { userList } = useGetUsers();
  const match = userList.find(({ label }) => label === mention);

  if (!match) {
    return <span>@{mention}</span>;
  }

  // const { firstName, lastName } = match.data;
  const { label } = match;

  const content = (
    <div style={{ display: 'flex' }}>
      <EuiAvatar name={label} size="s" />
      <EuiText
        css={css`
          margin-left: 8px;
        `}
      >
        {label}
      </EuiText>
    </div>
  );

  return (
    <EuiToolTip content={content}>
      <EuiText color={euiTheme.colors.primary}>@{mention}</EuiText>
    </EuiToolTip>
  );
};

mentionsMarkdownRendererComponent.displayName = 'mentionsMarkdownRenderer';

export const mentionsMarkdownRenderer = React.memo(mentionsMarkdownRendererComponent);

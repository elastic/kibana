/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, type EuiBadgeProps, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FlyoutDoc } from '../types';

const LEVEL_DICT = {
  error: 'danger',
  warn: 'warning',
  info: 'primary',
} as const;

interface LogLevelProps {
  level: FlyoutDoc['log.level'];
  iconType?: EuiBadgeProps['iconType'];
  iconSide?: EuiBadgeProps['iconSide'];
  hollow?: boolean;
}

export function LogLevel({ level = '-', iconType, iconSide }: LogLevelProps) {
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const { euiTheme } = useEuiTheme();
  const levelColor = LEVEL_DICT[level as keyof typeof LEVEL_DICT]
    ? euiTheme.colors[LEVEL_DICT[level as keyof typeof LEVEL_DICT]]
    : euiTheme.colors.text;

  return (
    <EuiBadge
      color="hollow"
      iconType={iconType}
      iconSide={iconSide}
      data-test-subj="logExplorerFlyoutLogLevel"
      css={css`
        border: 2px solid ${levelColor};
        font-size: ${xsFontSize};
        display: flex;
        justify-content: center;
      `}
    >
      {level}
    </EuiBadge>
  );
}

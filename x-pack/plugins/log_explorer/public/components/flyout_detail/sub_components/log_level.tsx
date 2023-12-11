/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';
import { FlyoutDoc } from '../types';

const LEVEL_DICT: Record<string, EuiBadgeProps['color']> = {
  error: 'danger',
  warn: 'warning',
  info: 'primary',
  default: 'default',
};

interface LogLevelProps {
  level: FlyoutDoc['log.level'];
}

export function LogLevel({ level }: LogLevelProps) {
  if (!level) return null;
  const levelColor = LEVEL_DICT[level] ?? LEVEL_DICT.default;

  return (
    <EuiBadge color={levelColor} data-test-subj="logExplorerFlyoutLogLevel">
      {level}
    </EuiBadge>
  );
}

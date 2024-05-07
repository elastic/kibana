/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { FlyoutDoc } from '../../../common/document';
import { ChipWithPopover } from './popover_chip';
import * as constants from '../../../common/constants';

const LEVEL_DICT = {
  error: 'danger',
  warn: 'warning',
  info: 'primary',
  debug: 'accent',
} as const;

interface LogLevelProps {
  level: FlyoutDoc['log.level'];
  dataTestSubj?: string;
  renderInFlyout?: boolean;
}

export function LogLevel({ level, dataTestSubj, renderInFlyout = false }: LogLevelProps) {
  const { euiTheme } = useEuiTheme();
  if (!level) return null;
  const levelColor = LEVEL_DICT[level as keyof typeof LEVEL_DICT]
    ? euiTheme.colors[LEVEL_DICT[level as keyof typeof LEVEL_DICT]]
    : null;

  const truncatedLogLevel = level.length > 10 ? level.substring(0, 10) + '...' : level;

  if (renderInFlyout) {
    return (
      <ChipWithPopover
        property={constants.LOG_LEVEL_FIELD}
        text={truncatedLogLevel}
        borderColor={levelColor}
        style={{ width: 'none' }}
        dataTestSubj={dataTestSubj}
        shouldRenderPopover={!renderInFlyout}
      />
    );
  }

  return (
    <ChipWithPopover
      property={constants.LOG_LEVEL_FIELD}
      text={level}
      rightSideIcon="arrowDown"
      borderColor={levelColor}
      style={{ width: '80px', marginTop: '-3px' }}
    />
  );
}

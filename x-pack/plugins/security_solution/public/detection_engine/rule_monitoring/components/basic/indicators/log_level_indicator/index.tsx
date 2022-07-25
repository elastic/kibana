/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { LogLevel } from '../../../../../../../common/detection_engine/rule_monitoring';
import { getBadgeColor, getBadgeText } from './utils';

interface LogLevelIndicatorProps {
  logLevel: LogLevel;
}

const LogLevelIndicatorComponent: React.FC<LogLevelIndicatorProps> = ({ logLevel }) => {
  const color = getBadgeColor(logLevel);
  const text = getBadgeText(logLevel);

  return <EuiBadge color={color}>{text}</EuiBadge>;
};

export const LogLevelIndicator = React.memo(LogLevelIndicatorComponent);
LogLevelIndicator.displayName = 'LogLevelIndicator';

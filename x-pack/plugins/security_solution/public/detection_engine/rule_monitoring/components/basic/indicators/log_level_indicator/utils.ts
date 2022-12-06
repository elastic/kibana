/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperCase } from 'lodash';
import type { IconColor } from '@elastic/eui';
import { LogLevel } from '../../../../../../../common/detection_engine/rule_monitoring';
import { assertUnreachable } from '../../../../../../../common/utility_types';

export const getBadgeColor = (logLevel: LogLevel): IconColor => {
  switch (logLevel) {
    case LogLevel.trace:
      return 'hollow';
    case LogLevel.debug:
      return 'hollow';
    case LogLevel.info:
      return 'default';
    case LogLevel.warn:
      return 'warning';
    case LogLevel.error:
      return 'danger';
    default:
      return assertUnreachable(logLevel, 'Unknown log level');
  }
};

export const getBadgeText = (logLevel: LogLevel): string => {
  return upperCase(logLevel);
};

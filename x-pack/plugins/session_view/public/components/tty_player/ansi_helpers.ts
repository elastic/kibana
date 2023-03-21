/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Teletype } from '../../../common/types/process_tree';
import {
  PROCESS_DATA_LIMIT_EXCEEDED_START,
  PROCESS_DATA_LIMIT_EXCEEDED_END,
  VIEW_POLICIES,
} from './translations';

export const renderTruncatedMsg = (tty?: Teletype, policiesUrl?: string, processName?: string) => {
  if (tty?.columns) {
    const lineBreak = '-'.repeat(tty.columns);
    const message = `  ⚠  ${PROCESS_DATA_LIMIT_EXCEEDED_START} \x1b[1m${processName}.\x1b[22m ${PROCESS_DATA_LIMIT_EXCEEDED_END}`;
    const link = policiesUrl
      ? `\x1b[${Math.min(
          message.length + 2,
          tty.columns - VIEW_POLICIES.length - 4
        )}G\x1b[1m\x1b]8;;${policiesUrl}\x1b\\[ ${VIEW_POLICIES} ]\x1b]8;;\x1b\\\x1b[22m`
      : '';

    return `\n\x1b[33m${lineBreak}\n${message}${link}\n${lineBreak}\x1b[0m\n\n`;
  }
};

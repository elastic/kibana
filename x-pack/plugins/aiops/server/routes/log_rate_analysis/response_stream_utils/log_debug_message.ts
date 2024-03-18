/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

export type LogDebugMessage = (msg: string) => void;

export const logDebugMessageFactory = (logger: Logger): LogDebugMessage => {
  let logMessageCounter = 0;

  return (msg: string) => {
    logMessageCounter++;
    logger.debug(`Log Rate Analysis #${logMessageCounter}: ${msg}`);
  };
};

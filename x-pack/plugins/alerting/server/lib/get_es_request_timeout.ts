/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { parseDuration } from '../../common';

export function getEsRequestTimeout(logger: Logger, timeout?: string): number | undefined {
  if (!timeout) {
    return undefined;
  }
  const maxRequestTimeout = 5 * 60 * 1000;
  try {
    const requestTimeout = parseDuration(timeout);
    // return the ES request timeout in ms that is capped at 5 min.
    return requestTimeout > maxRequestTimeout ? maxRequestTimeout : requestTimeout;
  } catch (error) {
    logger.debug(`Invalid format for the rule ES requestTimeout duration: "${timeout}"`);
    return undefined;
  }
}

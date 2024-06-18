/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerWrapper } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';

export const errorHandler: (logger: Logger) => RequestHandlerWrapper = (logger) => (handler) => {
  return async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      logger.error(e);
      throw e;
    }
  };
};

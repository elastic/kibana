/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable */
import { Logger } from '../../utils/logger';
import { Context } from '../index';

export const mockSourceData = {
  id: 'default',
  configuration: {
    fields: {
      host: 'beat.hostname',
    },
  },
};

export const getSourceQueryMock = (logger: Logger | null) => ({
  source: (root: unknown, args: unknown, context: Context) => {
    logger && logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger && logger.info(`Using mock for test ${mockSourceData}`);
        return mockSourceData;
      }
      default: {
        return {};
      }
    }
  },
});

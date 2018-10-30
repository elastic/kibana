/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../utils/logger';
import { Context } from '../index';

/* tslint:disable */
export const sourcesDataMock =
[
  {
    "id": "default",
    "configuration": {
      "fields": {
        "container": "docker.container.name",
        "host": "beat.hostname",
        "message": [
          "message",
          "@message"
        ]
      }
    }
  }
];
/* tslint:enable */

export const getAllSourcesQueryMock = (logger: Logger) => ({
  allSources: (root: unknown, args: unknown, context: Context) => {
    logger.info('Mock allSources');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${sourcesDataMock}`);
        return sourcesDataMock;
      }
      default: {
        logger.error(`Could not find a mock for: ${operationName}`);
        return [];
      }
    }
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import type { Logger } from '@kbn/core/server';

import { ApiEndpoint, ApiEndpointActions } from '../../common/api';

// We need this otherwise Kibana server will crash with a 'ERR_METHOD_NOT_IMPLEMENTED' error.
class ResponseStream extends Readable {
  _read(): void {}
}

const delimiter = '\n';

export function streamFactory<T extends ApiEndpoint>(logger: Logger) {
  const stream = new ResponseStream();

  function streamPush(d: ApiEndpointActions[T]) {
    try {
      const line = JSON.stringify(d);
      stream.push(`${line}${delimiter}`);
    } catch (error) {
      logger.error('Could not serialize or stream a message.');
      logger.error(error);
    }
  }

  return { delimiter, stream, streamPush };
}

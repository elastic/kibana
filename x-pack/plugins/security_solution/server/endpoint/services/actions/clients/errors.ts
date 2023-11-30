/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from '../../../utils/dump';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';

/**
 * Errors associated with Response Actions clients
 */
export class ResponseActionsClientError extends CustomHttpRequestError {
  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      meta: this.meta,
      stack: this.stack,
    };
  }

  toString() {
    const content = this.toJSON();
    content.meta = dump(content.meta);
    return JSON.stringify(content, null, 2);
  }
}

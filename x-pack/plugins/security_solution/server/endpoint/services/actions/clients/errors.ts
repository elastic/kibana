/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
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
    return JSON.stringify(dump(this.toJSON()), null, 2);
  }
}

export class ResponseActionsNotSupportedError extends ResponseActionsClientError {
  constructor(
    responseAction?: ResponseActionsApiCommandNames,
    statusCode: number = 405,
    meta?: unknown
  ) {
    super(`Action ${responseAction ? `[${responseAction}] ` : ''}not supported`, statusCode, meta);
  }
}

export class UnsupportedResponseActionsAgentTypeError extends ResponseActionsClientError {
  constructor(message: string, statusCode = 501, meta?: unknown) {
    super(message, statusCode, meta);
  }
}

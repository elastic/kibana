/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../../utils/stringify';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';

/**
 * Errors associated with Agent Status clients
 */
export class AgentStatusClientError extends CustomHttpRequestError {
  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      meta: this.meta,
      stack: this.stack,
    };
  }

  toString() {
    return stringify(this.toJSON());
  }
}

export class AgentStatusNotSupportedError extends AgentStatusClientError {
  constructor(
    agentIds: string[],
    agentType: ResponseActionAgentType,
    statusCode: number = 405,
    meta?: unknown
  ) {
    super(
      `Agent status is not available for ${`[agentIds: ${agentIds} and agentType: ${agentType}]`} not supported`,
      statusCode,
      meta
    );
  }
}

export class UnsupportedAgentTypeError extends AgentStatusClientError {
  constructor(message: string, statusCode = 501, meta?: unknown) {
    super(message, statusCode, meta);
  }
}

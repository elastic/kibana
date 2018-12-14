/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDocV1, APMDocV2, ContextService, Stackframe } from './APMDoc';

interface Agent {
  hostname: string;
  type: string;
  version: string;
}

interface Processor {
  name: 'error';
  event: 'error';
}

interface Context {
  process?: {
    pid: number;
  };
  service: ContextService;
}

interface Exception {
  message?: string; // either message or type are given
  type?: string;
  code?: string;
  module?: string;
  attributes?: unknown;
  handled?: boolean;
  stacktrace?: Stackframe[];
}

interface Log {
  message: string;
  param_message?: string;
  logger_name?: string;
  level?: string;
  stacktrace?: Stackframe[];
}

interface ErrorV1 extends APMDocV1 {
  version: 'v1';
  agent: Agent;
  processor: Processor;
  context: Context;
  transaction?: {
    id: string; // transaction ID is not required in v1
  };
  error: {
    id?: string; // ID is not required in v1
    timestamp: string;
    culprit: string;
    grouping_key: string;
    // either exception or log are given
    exception?: Exception;
    log?: Log;
  };
}

interface ErrorV2 extends APMDocV2 {
  version: 'v2';
  agent: Agent;
  processor: Processor;
  context: Context;
  transaction: {
    id: string; // transaction ID is required in v2
  };
  error: {
    id: string; // ID is required in v2
    timestamp: string;
    culprit: string;
    grouping_key: string;
    // either exception or log are given
    exception?: Exception;
    log?: Log;
  };
}

// Not calling it "Error" to avoid clashes with types for native Error
export type APMError = ErrorV1 | ErrorV2;

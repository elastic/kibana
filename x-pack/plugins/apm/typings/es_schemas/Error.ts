/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDocV1, APMDocV2 } from './APMDoc';
import {
  ContextProcess,
  ContextRequest,
  ContextService,
  ContextSystem
} from './Context';
import { IStackframe } from './Stackframe';

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
  process?: ContextProcess;
  service: ContextService;
  system?: ContextSystem;
  request?: ContextRequest;
  page?: {
    url: string;
  };
  [key: string]: unknown;
}

interface Exception {
  message?: string; // either message or type are given
  type?: string;
  code?: string;
  module?: string;
  attributes?: unknown;
  handled?: boolean;
  stacktrace?: IStackframe[];
}

interface Log {
  message: string;
  param_message?: string;
  logger_name?: string;
  level?: string;
  stacktrace?: IStackframe[];
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
    sampled?: boolean;
  };
  error: {
    id: string; // ID is required in v2
    culprit: string;
    grouping_key: string;
    // either exception or log are given
    exception?: Exception;
    log?: Log;
  };
}

// Not calling it "Error" to avoid clashes with types for native Error
export type APMError = ErrorV1 | ErrorV2;

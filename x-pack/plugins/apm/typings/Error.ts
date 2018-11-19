/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDocV1, ContextService, Stackframe } from './APMDoc';

export interface Error extends APMDocV1 {
  processor: {
    name: 'error';
    event: 'error';
  };
  context: {
    process?: {
      pid: number;
    };
    service: ContextService;
  };
  transaction?: {
    id: string; // transaction ID is not required in v1
  };
  error: {
    id?: string; // ID is not required in v1
    timestamp: string;
    culprit: string;
    grouping_key: string;
    // either exception or log are given
    exception?: {
      message?: string; // either message or type are given
      type?: string;
      code?: string;
      module?: string;
      attributes?: any;
      handled?: boolean;
      stacktrace?: Stackframe[];
    };
    log?: {
      message: string;
      param_message?: string;
      logger_name?: string;
      level?: string;
      stacktrace?: Stackframe[];
    };
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDoc, ContextService, Stackframe } from './APMDoc';

export interface DbContext {
  instance?: string;
  statement?: string;
  type?: string;
  user?: string;
}

export interface Span extends APMDoc {
  processor: {
    name: 'transaction';
    event: 'span';
  };
  context: {
    db?: DbContext;
    service: ContextService;
  };
  span: {
    duration: {
      us: number;
    };
    start: {
      us: number;
    };
    name: string;
    type: string;
    id: number; // id will be derived from hex encoded 64 bit hex_id string in v2
    hex_id?: string; // hex_id not available in v1
    parent?: string; // parent deprecated in v2
    stacktrace?: Stackframe[];
  };
  transaction: {
    id: string;
  };
}

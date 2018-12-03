/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDocV1, APMDocV2, ContextService, Stackframe } from './APMDoc';

export interface DbContext {
  instance?: string;
  statement?: string;
  type?: string;
  user?: string;
}

interface Processor {
  name: 'transaction';
  event: 'span';
}

export interface HttpContext {
  url?: string;
}

interface Context {
  db?: DbContext;
  http?: HttpContext;
  service: ContextService;
  [key: string]: unknown;
}

export interface SpanV1 extends APMDocV1 {
  version: 'v1';
  processor: Processor;
  context: Context;
  span: {
    duration: {
      us: number;
    };
    start: {
      us: number; // only v1
    };
    name: string;
    type: string;
    id: number; // we are manually adding span.id
    parent?: string; // only v1
    stacktrace?: Stackframe[];
  };
  transaction: {
    id: string;
  };
}

export interface SpanV2 extends APMDocV2 {
  version: 'v2';
  processor: Processor;
  context: Context;
  span: {
    duration: {
      us: number;
    };
    name: string;
    type: string;
    id: number; // id will be derived from hex encoded 64 bit hex_id string in v2
    hex_id: string; // only v2
    stacktrace?: Stackframe[];
  };
  transaction: {
    id: string;
  };
}

export type Span = SpanV1 | SpanV2;

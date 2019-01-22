/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDoc, Context } from './APMDoc';
import { IStackframe } from './Stackframe';

interface Processor {
  name: 'transaction';
  event: 'span';
}

// TODO: should spanContext extend shared context?
interface SpanContext extends Context {
  db?: {
    instance?: string;
    statement?: string;
    type?: string;
    user?: string;
  };
  http?: {
    method?: string;
    status_code?: number;
    url?: string;
  };
  tags?: {
    [key: string]: string; // is this always a string?
  };
}

export interface Span extends APMDoc {
  processor: Processor;
  context?: SpanContext;
  span: {
    action: string;
    duration: { us: number };
    id: string;
    name: string;
    stacktrace?: IStackframe[];
    subtype: string;
    sync: boolean;
    type: string;
  };
  transaction: {
    id: string;
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDoc } from './APMDoc';
import { IStackframe } from './fields/Stackframe';

interface Processor {
  name: 'transaction';
  event: 'span';
}

interface SpanContext {
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
}

export interface Span extends APMDoc {
  processor: Processor;
  context?: SpanContext;
  service: { name: string };
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
  transaction: { id: string };
}

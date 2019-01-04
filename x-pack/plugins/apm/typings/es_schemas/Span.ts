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

interface SpanContext extends Context {
  db?: {
    instance?: string;
    statement?: string;
    type?: string;
    user?: string;
  };
  http?: {
    url?: string;
  };
  tags?: {
    [key: string]: string;
  };
}

export interface Span extends APMDoc {
  processor: Processor;
  context?: SpanContext;
  span: {
    duration: {
      us: number;
    };
    name: string;
    type: string;
    id: string;
    stacktrace?: IStackframe[];
  };
  transaction: {
    id: string;
  };
}

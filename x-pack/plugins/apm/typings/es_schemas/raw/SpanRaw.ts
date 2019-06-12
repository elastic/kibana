/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './APMBaseDoc';
import { IStackframe } from './fields/Stackframe';

interface Processor {
  name: 'transaction';
  event: 'span';
}

export interface SpanRaw extends APMBaseDoc {
  processor: Processor;
  trace: { id: string }; // trace is required
  service: {
    name: string;
  };
  span: {
    action?: string;
    duration: { us: number };
    id: string;
    name: string;
    stacktrace?: IStackframe[];
    subtype?: string;
    sync?: boolean;
    type: string;
    http?: {
      url?: {
        original?: string;
      };
    };
    db?: {
      statement?: string;
      type?: string;
    };
  };
  transaction?: {
    id: string;
  };
}

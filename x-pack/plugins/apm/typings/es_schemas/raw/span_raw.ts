/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './apm_base_doc';
import { Stackframe } from './fields/stackframe';
import { TimestampUs } from './fields/timestamp_us';

interface Processor {
  name: 'transaction';
  event: 'span';
}

export interface SpanRaw extends APMBaseDoc {
  processor: Processor;
  trace: { id: string }; // trace is required
  service: {
    name: string;
    environment?: string;
  };
  span: {
    destination?: {
      service: {
        resource: string;
      };
    };
    action?: string;
    duration: { us: number };
    id: string;
    name: string;
    stacktrace?: Stackframe[];
    subtype?: string;
    sync?: boolean;
    type: string;
    http?: {
      url?: {
        original?: string;
      };
      response: {
        status_code: number;
      };
      method?: string;
    };
    db?: {
      statement?: string;
      type?: string;
    };
    message?: {
      queue?: { name: string };
      age?: { ms: number };
      body?: string;
      headers?: Record<string, unknown>;
    };
  };
  timestamp: TimestampUs;
  transaction?: {
    id: string;
  };
  child?: { id: string[] };
}

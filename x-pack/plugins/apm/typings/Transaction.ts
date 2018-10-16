/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDocV1, APMDocV2, ContextService } from './APMDoc';

interface Processor {
  name: 'transaction';
  event: 'transaction';
}

interface Context {
  process?: {
    pid: number;
  };
  service: ContextService;
  request: {
    url: {
      full: string;
    };
  };
  user?: {
    id: string;
  };
  [key: string]: any;
}

export interface TransactionV1 extends APMDocV1 {
  version: 'v1';
  processor: Processor;
  context: Context;
  transaction: {
    duration: {
      us: number;
    };
    id: string;
    name: string; // name could be missing in ES but the UI will always only aggregate on transactions with a name
    result?: string;
    sampled: boolean;
    span_count?: {
      dropped?: {
        total?: number;
      };
    };
    type: string;
  };
}

export interface TransactionV2 extends APMDocV2 {
  version: 'v2';
  processor: Processor;
  context: Context;
  transaction: {
    duration: {
      us: number;
    };
    id: string;
    name: string; // name could be missing in ES but the UI will always only aggregate on transactions with a name
    result?: string;
    sampled: boolean;

    span_count?: {
      started?: number; // only v2
      dropped?: {
        total?: number;
      };
    };
    type: string;
  };
}

export type Transaction = TransactionV1 | TransactionV2;

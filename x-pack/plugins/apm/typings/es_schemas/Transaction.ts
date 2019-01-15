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

interface Processor {
  name: 'transaction';
  event: 'transaction';
}

interface Context {
  process?: ContextProcess;
  service: ContextService;
  system?: ContextSystem;
  request: ContextRequest;
  user?: {
    id: string;
    username?: string;
    email?: string;
  };
  page?: {
    url: string;
  };
  [key: string]: unknown;
}

interface Marks {
  agent?: {
    [name: string]: number;
  };
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
    marks?: Marks;
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
    marks?: Marks;
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
  kubernetes?: {
    pod: {
      uid: string;
    };
  };
  docker?: {
    container: {
      id: string;
    };
  };
  container: {
    id: string;
  };
}

export type Transaction = TransactionV1 | TransactionV2;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDoc } from './APMDoc';

interface Processor {
  name: 'transaction';
  event: 'transaction';
}

interface Marks {
  agent?: {
    [name: string]: number;
  };
}

export interface Transaction extends APMDoc {
  processor: Processor;
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
      started?: number;
      dropped?: number;
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

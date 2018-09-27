/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDoc, ContextService } from './APMDoc';

export interface Transaction extends APMDoc {
  processor: {
    name: 'transaction';
    event: 'transaction';
  };
  context: {
    process?: {
      pid: number;
    };
    service: ContextService;
  };
  transaction: {
    duration: {
      us: number;
    };
    id: string;
    name: string; // name could be missing in ES but the UI will always only aggregate on transactions with a name
    result?: string;
    sampled: boolean;

    // span_count.started not available in v1
    span_count?: {
      started?: number;
      dropped?: {
        total?: number;
      };
    };
    type: string;
  };
}

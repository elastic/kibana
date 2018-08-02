/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Transaction {
  '@timestamp': string;
  beat: {
    hostname: string;
    name: string;
    version: string;
  };
  context: Context;
  host: {
    name: string;
  };
  parent?: {
    id: string;
  };
  processor: {
    name: 'transaction';
    event: 'transaction';
  };
  // trace ID is not available in v1
  trace?: {
    id: string;
  };
  transaction: {
    duration: {
      us: number;
    };
    id: string;
    name: string;
    result: string;
    sampled: boolean;
    span_count: {
      started: number;
      dropped: {
        total: number;
      };
    };
    type: string;
  };
}

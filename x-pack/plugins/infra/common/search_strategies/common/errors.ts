/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

const genericErrorRT = rt.type({
  type: rt.literal('generic'),
  message: rt.string,
});

const shardFailureErrorRT = rt.type({
  type: rt.literal('shardFailure'),
  shardInfo: rt.type({
    shard: rt.number,
    index: rt.string,
    node: rt.string,
  }),
  message: rt.string,
});

export const searchStrategyErrorRT = rt.union([genericErrorRT, shardFailureErrorRT]);

export type SearchStrategyError = rt.TypeOf<typeof searchStrategyErrorRT>;

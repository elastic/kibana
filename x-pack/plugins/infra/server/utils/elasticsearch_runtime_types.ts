/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const shardFailureRT = rt.type({
  index: rt.string,
  node: rt.string,
  reason: rt.type({
    reason: rt.string,
    type: rt.string,
  }),
  shard: rt.number,
});

export type ShardFailure = rt.TypeOf<typeof shardFailureRT>;

export const commonSearchSuccessResponseFieldsRT = rt.type({
  _shards: rt.intersection([
    rt.type({
      total: rt.number,
      successful: rt.number,
      skipped: rt.number,
      failed: rt.number,
    }),
    rt.partial({
      failures: rt.array(shardFailureRT),
    }),
  ]),
  timed_out: rt.boolean,
  took: rt.number,
});

export const commonHitFieldsRT = rt.type({
  _index: rt.string,
  _id: rt.string,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const commonSearchSuccessResponseFieldsRT = rt.type({
  _shards: rt.type({
    total: rt.number,
    successful: rt.number,
    skipped: rt.number,
    failed: rt.number,
  }),
  timed_out: rt.boolean,
  took: rt.number,
});

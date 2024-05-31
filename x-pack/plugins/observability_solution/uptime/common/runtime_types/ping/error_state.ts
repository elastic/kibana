/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
export const StateEndsCodec = t.type({
  duration_ms: t.union([t.string, t.number]),
  checks: t.number,
  ends: t.union([t.string, t.null]),
  started_at: t.string,
  id: t.string,
  up: t.number,
  down: t.number,
  status: t.string,
});

export const ErrorStateCodec = t.type({
  duration_ms: t.union([t.string, t.number]),
  checks: t.number,
  ends: t.union([StateEndsCodec, t.null]),
  started_at: t.string,
  id: t.string,
  up: t.number,
  down: t.number,
  status: t.string,
});

export type ErrorState = t.TypeOf<typeof ErrorStateCodec>;

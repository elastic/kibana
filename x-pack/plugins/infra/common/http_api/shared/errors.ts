/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const badRequestErrorRT = rt.intersection([
  rt.type({
    statusCode: rt.literal(400),
    error: rt.literal('Bad Request'),
    message: rt.string,
  }),
  rt.partial({
    attributes: rt.unknown,
  }),
]);

export const forbiddenErrorRT = rt.intersection([
  rt.type({
    statusCode: rt.literal(403),
    error: rt.literal('Forbidden'),
    message: rt.string,
  }),
  rt.partial({
    attributes: rt.unknown,
  }),
]);

export const conflictErrorRT = rt.intersection([
  rt.type({
    statusCode: rt.literal(409),
    error: rt.literal('Conflict'),
    message: rt.string,
  }),
  rt.partial({
    attributes: rt.unknown,
  }),
]);

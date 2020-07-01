/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const body = t.string;

export const created = t.number; // TODO: Make this into an ISO Date string check

export const encoding = t.keyof({
  'application/json': null,
});

export const schemaVersion = t.keyof({
  '1.0.0': null,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const artifactName = t.string;

export const body = t.string;

export const created = t.string; // TODO: Make this into an ISO Date string check

export const encoding = t.keyof({
  xz: null,
});

export const manifestVersion = t.string;

export const manifestSchemaVersion = t.keyof({
  '1.0.0': null,
});

export const schemaVersion = t.keyof({
  '1.0.0': null,
});

export const sha256 = t.string;

export const size = t.number;

export const url = t.string;

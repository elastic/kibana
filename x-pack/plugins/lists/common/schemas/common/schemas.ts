/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { NonEmptyString } from '../types/non_empty_string';

export const name = t.string;
export const description = t.string;
export const list_id = NonEmptyString;
export const item = t.string;
export const meta = t.object;
export const created_at = t.string; // TODO: Make this into an ISO Date string check
export const updated_at = t.string; // TODO: Make this into an ISO Date string check
export const updated_by = t.string;
export const created_by = t.string;
export const file = t.object;
export const id = NonEmptyString;
export const value = t.string;
export const tie_breaker_id = t.string; // TODO: Use UUID for this instead of a string for validation

export const type = t.keyof({ ip: null, keyword: null }); // TODO: Add the other data types here
export type Type = t.TypeOf<typeof type>;

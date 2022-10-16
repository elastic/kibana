/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

// -------------------------------------------------------------------------------------------------
// Attributes specific to EQL rules

export type EventCategoryOverride = t.TypeOf<typeof EventCategoryOverride>;
export const EventCategoryOverride = t.string; // should be non-empty string?

export type TimestampField = t.TypeOf<typeof TimestampField>;
export const TimestampField = t.string; // should be non-empty string?

export type TiebreakerField = t.TypeOf<typeof TiebreakerField>;
export const TiebreakerField = t.string; // should be non-empty string?

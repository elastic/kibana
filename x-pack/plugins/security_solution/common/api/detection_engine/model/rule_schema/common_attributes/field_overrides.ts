/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export type RuleNameOverride = t.TypeOf<typeof RuleNameOverride>;
export const RuleNameOverride = t.string; // should be non-empty string?

export type TimestampOverride = t.TypeOf<typeof TimestampOverride>;
export const TimestampOverride = t.string; // should be non-empty string?

export type TimestampOverrideFallbackDisabled = t.TypeOf<typeof TimestampOverrideFallbackDisabled>;
export const TimestampOverrideFallbackDisabled = t.boolean;

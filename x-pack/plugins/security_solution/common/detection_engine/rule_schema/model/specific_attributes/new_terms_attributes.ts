/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { LimitedSizeArray, NonEmptyString } from '@kbn/securitysolution-io-ts-types';

// Attributes specific to New Terms rules

/**
 * New terms rule type currently only supports a single term, but should support more in the future
 */
export type NewTermsFields = t.TypeOf<typeof NewTermsFields>;
export const NewTermsFields = LimitedSizeArray({ codec: t.string, minSize: 1, maxSize: 3 });

export type HistoryWindowStart = t.TypeOf<typeof HistoryWindowStart>;
export const HistoryWindowStart = NonEmptyString;

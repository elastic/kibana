/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { has } from 'lodash/fp';

import type { MlError } from '../types';

export interface MlStartJobError {
  error: MlError;
  started: boolean;
}

// use the "in operator" and regular type guards to do a narrow once this issue is fixed below:
// https://github.com/microsoft/TypeScript/issues/21732
// Otherwise for now, has will work ok even though it casts 'unknown' to 'any'
export const isMlStartJobError = (value: unknown): value is MlStartJobError =>
  has('error.msg', value) && has('error.response', value) && has('error.statusCode', value);

export const isUnknownError = (value: unknown): value is ErrorResponseBase =>
  has('error.error.reason', value);

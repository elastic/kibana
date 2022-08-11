/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { Rule } from '../types';
import { RuleRunMetrics } from './rule_run_metrics_store';

// represents a Date from an ISO string
export const DateFromString = new t.Type<Date, string, unknown>(
  'DateFromString',
  // detect the type
  (value): value is Date => value instanceof Date,
  (valueToDecode, context) =>
    either.chain(
      // validate this is a string
      t.string.validate(valueToDecode, context),
      // decode
      (value) => {
        const decoded = new Date(value);
        return isNaN(decoded.getTime()) ? t.failure(valueToDecode, context) : t.success(decoded);
      }
    ),
  (valueToEncode) => valueToEncode.toISOString()
);

export type RuleInfo = Pick<Rule, 'name' | 'alertTypeId' | 'id'> & { spaceId: string };

export interface LogSearchMetricsOpts {
  esSearchDuration: number;
  totalSearchDuration: number;
}

export type SearchMetrics = Pick<
  RuleRunMetrics,
  'numSearches' | 'totalSearchDurationMs' | 'esSearchDurationMs'
>;

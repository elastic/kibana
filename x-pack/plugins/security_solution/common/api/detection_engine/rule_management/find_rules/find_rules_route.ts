/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DefaultPerPage, DefaultPage } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleResponse } from '../../model';
import { SortOrder, queryFilter, fields } from '../../model';

export type FindRulesSortField = t.TypeOf<typeof FindRulesSortField>;
export const FindRulesSortField = t.union([
  t.literal('created_at'),
  t.literal('createdAt'), // Legacy notation, keeping for backwards compatibility
  t.literal('enabled'),
  t.literal('execution_summary.last_execution.date'),
  t.literal('execution_summary.last_execution.metrics.execution_gap_duration_s'),
  t.literal('execution_summary.last_execution.metrics.total_indexing_duration_ms'),
  t.literal('execution_summary.last_execution.metrics.total_search_duration_ms'),
  t.literal('execution_summary.last_execution.status'),
  t.literal('name'),
  t.literal('risk_score'),
  t.literal('riskScore'), // Legacy notation, keeping for backwards compatibility
  t.literal('severity'),
  t.literal('updated_at'),
  t.literal('updatedAt'), // Legacy notation, keeping for backwards compatibility
]);

export type FindRulesSortFieldOrUndefined = t.TypeOf<typeof FindRulesSortFieldOrUndefined>;
export const FindRulesSortFieldOrUndefined = t.union([FindRulesSortField, t.undefined]);

/**
 * Query string parameters of the API route.
 */
export type FindRulesRequestQuery = t.TypeOf<typeof FindRulesRequestQuery>;
export const FindRulesRequestQuery = t.exact(
  t.partial({
    fields,
    filter: queryFilter,
    sort_field: FindRulesSortField,
    sort_order: SortOrder,
    page: DefaultPage, // defaults to 1
    per_page: DefaultPerPage, // defaults to 20
  })
);

export interface FindRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: RuleResponse[];
}

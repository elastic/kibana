/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { DefaultPerPage, DefaultPage } from '@kbn/securitysolution-io-ts-alerting-types';
import { defaultCsvArray, IsoDateString, NonEmptyString } from '@kbn/securitysolution-io-ts-types';

import { DefaultSortOrderDesc, PaginationResult } from '../../../model';
import { RuleExecutionEvent, TRuleExecutionEventType, TLogLevel } from '../../model';

/**
 * URL path parameters of the API route.
 */
export type GetRuleExecutionEventsRequestParams = t.TypeOf<
  typeof GetRuleExecutionEventsRequestParams
>;
export const GetRuleExecutionEventsRequestParams = t.exact(
  t.type({
    ruleId: NonEmptyString,
  })
);

/**
 * Query string parameters of the API route.
 */
export type GetRuleExecutionEventsRequestQuery = t.TypeOf<
  typeof GetRuleExecutionEventsRequestQuery
>;
export const GetRuleExecutionEventsRequestQuery = t.exact(
  t.intersection([
    t.partial({
      search_term: NonEmptyString,
      event_types: defaultCsvArray(TRuleExecutionEventType),
      log_levels: defaultCsvArray(TLogLevel),
      date_start: IsoDateString,
      date_end: IsoDateString,
    }),
    t.type({
      sort_order: DefaultSortOrderDesc, // defaults to 'desc'
      page: DefaultPage, // defaults to 1
      per_page: DefaultPerPage, // defaults to 20
    }),
  ])
);

/**
 * Response body of the API route.
 */
export type GetRuleExecutionEventsResponse = t.TypeOf<typeof GetRuleExecutionEventsResponse>;
export const GetRuleExecutionEventsResponse = t.exact(
  t.type({
    events: t.array(RuleExecutionEvent),
    pagination: PaginationResult,
  })
);

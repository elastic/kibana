/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultPage, DefaultPerPage } from '@kbn/securitysolution-io-ts-alerting-types';
import { defaultCsvArray, NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import type { Either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { capitalize } from 'lodash';
import { TRuleExecutionEventType } from '../../model/execution_event';
import { TLogLevel } from '../../model/log_level';



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
  t.type({
    event_types: defaultCsvArray(TRuleExecutionEventType),
    log_levels: defaultCsvArray(TLogLevel),
    sort_order: DefaultSortOrderDesc, // defaults to 'desc'
    page: DefaultPage, // defaults to 1
    per_page: DefaultPerPage, // defaults to 20
  })
);

type SortOrder = t.TypeOf<typeof SortOrder>;
const SortOrder = t.keyof({ asc: null, desc: null });

const defaultSortOrder = (order: SortOrder): t.Type<SortOrder, SortOrder, unknown> => {
  return new t.Type<SortOrder, SortOrder, unknown>(
    `DefaultSortOrder${capitalize(order)}`,
    SortOrder.is,
    (input, context): Either<t.Errors, SortOrder> =>
      input == null ? t.success(order) : SortOrder.validate(input, context),
    t.identity
  );
};

/**
 * Types the DefaultSortOrderAsc as:
 *   - If undefined, then a default sort order of 'asc' will be set
 *   - If a string is sent in, then the string will be validated to ensure it's a valid SortOrder
 */
export const DefaultSortOrderAsc = defaultSortOrder('asc');

/**
 * Types the DefaultSortOrderDesc as:
 *   - If undefined, then a default sort order of 'desc' will be set
 *   - If a string is sent in, then the string will be validated to ensure it's a valid SortOrder
 */
export const DefaultSortOrderDesc = defaultSortOrder('desc');

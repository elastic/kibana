/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

// import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DefaultPerPage, DefaultPage } from '@kbn/securitysolution-io-ts-alerting-types';
import { DefaultEmptyString, IsoDateString } from '@kbn/securitysolution-io-ts-types';

import { Either } from 'fp-ts/lib/Either';
import { ruleExecutionStatus } from '../common';

/**
 * Types the DefaultStatusFiltersStringArray as:
 *   - If undefined, then a default array will be set
 *   - If an array is sent in, then the array will be validated to ensure all elements are a ruleExecutionStatus
 */
export const DefaultStatusFiltersStringArray = new t.Type<string[], string[] | undefined, unknown>(
  'DefaultStatusFiltersStringArray',
  t.array(t.string).is,
  (input, context): Either<t.Errors, string[]> => {
    if (input == null) {
      return t.success([]);
    } else if (typeof input === 'string') {
      return t.array(ruleExecutionStatus).validate(input.split(','), context);
    } else {
      return t.array(ruleExecutionStatus).validate(input, context);
    }
  },
  t.identity
);

const sortFields = t.keyof({
  timestamp: null,
  duration_ms: null,
  gap_duration_ms: null,
  indexing_duration_ms: null,
  search_duration_ms: null,
  schedule_delay_ms: null,
});

/**
 * Types the DefaultSortField as:
 *   - If undefined, then a default sort field of 'timestamp' will be set
 *  - If a string is sent in, then the string will be validated to ensure it is as valid sortFields
 */
export const DefaultSortField = new t.Type<string, string | undefined, unknown>(
  'DefaultSortField',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success('timestamp') : sortFields.validate(input, context),
  t.identity
);

// TODO: Getting type error when using estypes.SortOrder?
const sortOrder = t.keyof({ asc: null, desc: null });

/**
 * Types the DefaultSortOrder as:
 *   - If undefined, then a default sort order of 'desc' will be set
 *   - If a string is sent in, then the string will be validated to ensure it is as valid sortOrder
 */
export const DefaultSortOrder = new t.Type<string, string | undefined, unknown>(
  'DefaultSortOrder',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success('desc') : sortOrder.validate(input, context),
  t.identity
);

export const GetRuleExecutionEventsRequestParams = t.exact(
  t.type({
    ruleId: t.string,
  })
);

export const GetRuleExecutionEventsQueryParams = t.exact(
  t.type({
    start: IsoDateString,
    end: IsoDateString,
    query_text: DefaultEmptyString, // default to "" if not sent in during decode
    status_filters: DefaultStatusFiltersStringArray, // defaults to empty array if not sent in during decode
    per_page: DefaultPerPage, // defaults to "20" if not sent in during decode
    page: DefaultPage, // defaults to "1" if not sent in during decode
    sort_field: DefaultSortField, // defaults to "desc" if not sent in during decode
    sort_order: DefaultSortOrder, // defaults to "timestamp" if not sent in during decode
  })
);

export type GetRuleExecutionEventsRequestParams = t.TypeOf<
  typeof GetRuleExecutionEventsRequestParams
>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { DefaultPage, DefaultPerPage } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  defaultCsvArray,
  DefaultEmptyString,
  defaultValue,
  IsoDateString,
  NonEmptyString,
} from '@kbn/securitysolution-io-ts-types';

import { DefaultSortOrderDesc } from '../../../schemas/common';
import { SortFieldOfRuleExecutionResult } from '../../model/execution_result';
import { TRuleExecutionStatus } from '../../model/execution_status';

/**
 * Types the DefaultRuleExecutionStatusCsvArray as:
 *   - If not specified, then a default empty array will be set
 *   - If an array is sent in, then the array will be validated to ensure all elements are a RuleExecutionStatus
 *     (or that the array is empty)
 *   - If a CSV string is sent in, then it will be parsed to an array which will be validated
 */
export const DefaultRuleExecutionStatusCsvArray = defaultCsvArray(TRuleExecutionStatus);

/**
 * Types the DefaultSortField as:
 *   - If undefined, then a default sort field of 'timestamp' will be set
 *   - If a string is sent in, then the string will be validated to ensure it is as valid sortFields
 */
export const DefaultSortField = defaultValue(
  SortFieldOfRuleExecutionResult,
  'timestamp',
  'DefaultSortField'
);

/**
 * Path parameters of the API route.
 */
export type GetRuleExecutionResultsRequestParams = t.TypeOf<
  typeof GetRuleExecutionResultsRequestParams
>;
export const GetRuleExecutionResultsRequestParams = t.exact(
  t.type({
    ruleId: NonEmptyString,
  })
);

/**
 * Query string parameters of the API route.
 */
export type GetRuleExecutionResultsRequestQuery = t.TypeOf<
  typeof GetRuleExecutionResultsRequestQuery
>;
export const GetRuleExecutionResultsRequestQuery = t.exact(
  t.type({
    start: IsoDateString,
    end: IsoDateString,
    query_text: DefaultEmptyString, // defaults to ''
    status_filters: DefaultRuleExecutionStatusCsvArray, // defaults to []
    sort_field: DefaultSortField, // defaults to 'timestamp'
    sort_order: DefaultSortOrderDesc, // defaults to 'desc'
    page: DefaultPage, // defaults to 1
    per_page: DefaultPerPage, // defaults to 20
  })
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { DefaultPerPage, DefaultPage } from '@kbn/securitysolution-io-ts-alerting-types';
import { defaultCsvArray, NonEmptyString } from '@kbn/securitysolution-io-ts-types';

import { DefaultSortOrderDesc } from '../../../schemas/common';
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

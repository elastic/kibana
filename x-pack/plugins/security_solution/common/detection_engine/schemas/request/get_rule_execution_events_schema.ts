/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { sortFieldOrUndefined, sortOrderOrUndefined } from '../common';

export const GetRuleExecutionEventsRequestParams = t.exact(
  t.type({
    ruleId: t.string,
  })
);

export const GetRuleExecutionEventsQueryParams = t.exact(
  t.type({
    start: t.string,
    end: t.string,
    query_text: t.union([t.string, t.undefined]),
    status_filters: t.union([t.string, t.undefined]),
    per_page: t.union([t.string, t.undefined]),
    page: t.union([t.string, t.undefined]),
    sort_field: sortFieldOrUndefined,
    sort_order: sortOrderOrUndefined,
  })
);

export type GetRuleExecutionEventsRequestParams = t.TypeOf<
  typeof GetRuleExecutionEventsRequestParams
>;

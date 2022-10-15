/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { DefaultPerPage, DefaultPage } from '@kbn/securitysolution-io-ts-alerting-types';
import type { PerPage, Page } from '../../../../schemas/common';
import { queryFilter, fields, SortField, SortOrder } from '../../../../schemas/common';

export const findRulesSchema = t.exact(
  t.partial({
    fields,
    filter: queryFilter,
    sort_field: SortField,
    sort_order: SortOrder,
    page: DefaultPage, // defaults to 1
    per_page: DefaultPerPage, // defaults to 20
  })
);

export type FindRulesSchema = t.TypeOf<typeof findRulesSchema>;
export type FindRulesSchemaDecoded = Omit<FindRulesSchema, 'per_page'> & {
  page: Page;
  per_page: PerPage;
};

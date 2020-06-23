/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { queryFilter, fields, sort_field, sort_order, PerPage, Page } from '../common/schemas';
import { DefaultPerPage } from '../types/default_per_page';
import { DefaultPage } from '../types/default_page';
/* eslint-enable @typescript-eslint/camelcase */

export const findRulesSchema = t.exact(
  t.partial({
    fields,
    filter: queryFilter,
    per_page: DefaultPerPage, // defaults to "20" if not sent in during decode
    page: DefaultPage, // defaults to "1" if not sent in during decode
    sort_field,
    sort_order,
  })
);

export type FindRulesSchema = t.TypeOf<typeof findRulesSchema>;
export type FindRulesSchemaDecoded = Omit<FindRulesSchema, 'per_page'> & {
  per_page: PerPage;
  page: Page;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { DefaultPerPage, DefaultPage } from '@kbn/securitysolution-io-ts-alerting-types';
import { queryFilter, fields, sort_field, sort_order, PerPage, Page } from '../common/schemas';

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

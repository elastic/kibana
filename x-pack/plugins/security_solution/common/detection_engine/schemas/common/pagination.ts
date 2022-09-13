/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveInteger, PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';

export type Page = t.TypeOf<typeof Page>;
export const Page = PositiveIntegerGreaterThanZero;

export type PageOrUndefined = t.TypeOf<typeof PageOrUndefined>;
export const PageOrUndefined = t.union([Page, t.undefined]);

export type PerPage = t.TypeOf<typeof PerPage>;
export const PerPage = PositiveInteger;

export type PerPageOrUndefined = t.TypeOf<typeof PerPageOrUndefined>;
export const PerPageOrUndefined = t.union([PerPage, t.undefined]);

export type PaginationResult = t.TypeOf<typeof PaginationResult>;
export const PaginationResult = t.type({
  page: Page,
  per_page: PerPage,
  total: PositiveInteger,
});

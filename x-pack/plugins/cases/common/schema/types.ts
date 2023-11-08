/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { NumberFromString } from '../api/saved_object';

const PageTypeRt = rt.union([rt.number, NumberFromString]);
type PageNumberType = rt.TypeOf<typeof PageTypeRt>;

export interface Pagination {
  page: PageNumberType;
  perPage: PageNumberType;
}

export const PaginationSchemaRt = rt.exact(rt.partial({ page: PageTypeRt, perPage: PageTypeRt }));
export type PartialPaginationType = Partial<Pagination>;

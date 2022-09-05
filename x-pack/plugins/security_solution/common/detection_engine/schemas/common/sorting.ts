/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { Either } from 'fp-ts/lib/Either';
import { capitalize } from 'lodash';

export type SortField = t.TypeOf<typeof SortField>;
export const SortField = t.string;

export type SortFieldOrUndefined = t.TypeOf<typeof SortFieldOrUndefined>;
export const SortFieldOrUndefined = t.union([SortField, t.undefined]);

export type SortOrder = t.TypeOf<typeof SortOrder>;
export const SortOrder = t.keyof({ asc: null, desc: null });

export type SortOrderOrUndefined = t.TypeOf<typeof SortOrderOrUndefined>;
export const SortOrderOrUndefined = t.union([SortOrder, t.undefined]);

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

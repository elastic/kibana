/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isString } from 'lodash/fp';
import { PaginationInputPaginated, Inspect } from '../../search_strategy';
import { ESQuery } from '../../typed_json';

export const createQueryFilterClauses = (filterQuery: ESQuery | string | undefined) =>
  !isEmpty(filterQuery) ? [isString(filterQuery) ? JSON.parse(filterQuery) : filterQuery] : [];

export const createFilter = (filterQuery: ESQuery | string | undefined) =>
  isString(filterQuery) ? filterQuery : JSON.stringify(filterQuery);

export type InspectResponse = Inspect & { response: string[] };

export const generateTablePaginationOptions = (
  activePage: number,
  limit: number
): PaginationInputPaginated => {
  const cursorStart = activePage * limit;

  return {
    activePage,
    cursorStart,
    fakePossibleCount: 4 <= activePage && activePage > 0 ? limit * (activePage + 2) : limit * 5,
    querySize: limit,
  };
};

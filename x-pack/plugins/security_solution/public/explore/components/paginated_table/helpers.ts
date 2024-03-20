/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaginationInputPaginatedInput } from '../../../../common/api/search_strategy';

export const generateTablePaginationOptions = (
  activePage: number,
  limit: number,
  isBucketSort?: boolean
): PaginationInputPaginatedInput => {
  const cursorStart = activePage * limit;
  return {
    activePage,
    cursorStart,
    fakePossibleCount: 4 <= activePage && activePage > 0 ? limit * (activePage + 2) : limit * 5,
    querySize: isBucketSort ? limit : limit + cursorStart,
  };
};

export const getLimitedPaginationOptions = (
  activePage: number,
  limit: number
): PaginationInputPaginatedInput => {
  const cursorStart = activePage * limit;
  return {
    activePage,
    cursorStart,
    querySize: limit + cursorStart,
    fakePossibleCount: 0, // TODO: remove this
  };
};

export const getLimitedPaginationTotalCount = ({
  activePage,
  limit,
  totalCount,
}: {
  activePage: number;
  limit: number;
  totalCount: number;
}): number => {
  const fakePossibleCount =
    4 <= activePage && activePage > 0 ? limit * (activePage + 2) : limit * 5;
  return fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
};

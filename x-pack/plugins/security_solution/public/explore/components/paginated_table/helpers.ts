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
    fakePossibleCount: getFakePossibleCount(activePage, limit),
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
    // TODO: Limited pagination behavior is UI-only logic, the server API should not have to know anything about it.
    // Remove this parameter from the API schema when all security solution requests are updated.
    fakePossibleCount: 0,
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
  const fakePossibleCount = getFakePossibleCount(activePage, limit);
  return fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
};

/**
 * This function returns a fake possible count based on the active page and limit.
 * The goal is to restring the pagination to prevent querying arbitrary pages, which may cause performance issues.
 * After initializing the table we allow the user to navigate to pages 1-5.
 * If the user reaches page 5 or higher, we only allow to go to the following page.
 */
const getFakePossibleCount = (activePage: number, limit: number): number => {
  return activePage < 4 ? limit * 5 : limit * (activePage + 2);
};

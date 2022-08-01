/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaginationInputPaginated } from '../../../../common/search_strategy';
import { SHOWING } from './translations';

export const generateTablePaginationOptions = (
  activePage: number,
  limit: number,
  isBucketSort?: boolean
): PaginationInputPaginated => {
  const cursorStart = activePage * limit;
  return {
    activePage,
    cursorStart,
    fakePossibleCount: 4 <= activePage && activePage > 0 ? limit * (activePage + 2) : limit * 5,
    querySize: isBucketSort ? limit : limit + cursorStart,
  };
};

export const getSubtitle = ({
  loadingInitial,
  headerSubtitle,
  headerCount,
  headerUnit,
}: {
  loadingInitial: boolean;
  headerSubtitle?: string | React.ReactElement;
  headerCount: number | null | undefined;
  headerUnit?: string | React.ReactElement;
}) =>
  !loadingInitial && headerSubtitle
    ? `${SHOWING}: ${headerSubtitle}`
    : headerUnit &&
      `${SHOWING}: ${
        headerCount != null && headerCount >= 0 ? headerCount.toLocaleString() : 0
      } ${headerUnit}`;

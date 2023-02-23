/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';

export const getLimitProperties = (
  totalItems: number,
  maxItems: number,
  pageSize: number,
  pageIndex: number
): { isLastLimitedPage: boolean; limitedTotalItemCount: number } => {
  const limitItems = totalItems > maxItems;
  const limitedTotalItemCount = limitItems ? maxItems : totalItems;
  const lastLimitedPage = Math.ceil(limitedTotalItemCount / pageSize);
  const isLastPage = lastLimitedPage === pageIndex + 1;
  const isLastLimitedPage = limitItems && isLastPage;

  return { isLastLimitedPage, limitedTotalItemCount };
};

export const useLimitProperties = ({
  total,
  pageIndex,
  pageSize,
}: {
  total?: number;
  pageSize: number;
  pageIndex: number;
}) =>
  useMemo(
    () => getLimitProperties(total || 0, MAX_FINDINGS_TO_LOAD, pageSize, pageIndex),
    [total, pageIndex, pageSize]
  );

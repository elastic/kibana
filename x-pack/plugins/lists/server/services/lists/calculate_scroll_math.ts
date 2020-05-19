/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Page, PerPage } from '../../../common/schemas';

interface CalculateScrollMathOptions {
  perPage: PerPage;
  page: Page;
  hopSize: number;
}

interface CalculateScrollMathReturn {
  hops: number;
  leftOverAfterHops: number;
}

export const calculateScrollMath = ({
  page,
  perPage,
  hopSize,
}: CalculateScrollMathOptions): CalculateScrollMathReturn => {
  const startPageIndex = (page - 1) * perPage;
  const hops = Math.floor(startPageIndex / hopSize);
  const leftOverAfterHops = startPageIndex - hops * hopSize;
  return {
    hops,
    leftOverAfterHops,
  };
};

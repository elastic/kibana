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
  currentIndexPosition: number;
}

interface CalculateScrollMathReturn {
  hops: number;
  leftOverAfterHops: number;
}

export const calculateScrollMath = ({
  currentIndexPosition,
  page,
  perPage,
  hopSize,
}: CalculateScrollMathOptions): CalculateScrollMathReturn => {
  const startPageIndex = (page - 1) * perPage - currentIndexPosition;
  if (startPageIndex < 0) {
    // This should never be hit but just in case I do a check. We do validate higher above this
    // before the current index position gets to this point but to be safe we add this line.
    throw new Error(
      `page: ${page}, perPage ${perPage} and currentIndex ${currentIndexPosition} are less than zero`
    );
  }
  const hops = Math.floor(startPageIndex / hopSize);
  const leftOverAfterHops = startPageIndex - hops * hopSize;
  return {
    hops,
    leftOverAfterHops,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const generateTablePaginationOptions = (
  activePage: number,
  limit: number,
  tiebreaker?: string | null
) => {
  const cursorStart = activePage * limit;
  return {
    activePage,
    cursor: String(cursorStart),
    limit: limit + cursorStart,
    tiebreaker,
  };
};

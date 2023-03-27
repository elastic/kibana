/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedUrlQueryParams, PartialQueryParams } from '../../../common/ui/types';

export const parseUrlQueryParams = (parsedUrlParams: ParsedUrlQueryParams): PartialQueryParams => {
  const urlParams: PartialQueryParams = {
    ...(parsedUrlParams.sortField && { sortField: parsedUrlParams.sortField }),
    ...(parsedUrlParams.sortOrder && { sortOrder: parsedUrlParams.sortOrder }),
  };

  const intPage = parsedUrlParams.page && parseInt(parsedUrlParams.page, 10);
  const intPerPage = parsedUrlParams.perPage && parseInt(parsedUrlParams.perPage, 10);

  // page=0 is deliberately ignored
  if (intPage) {
    urlParams.page = intPage;
  }

  // perPage=0 is deliberately ignored
  if (intPerPage) {
    urlParams.perPage = intPerPage;
  }

  return urlParams;
};

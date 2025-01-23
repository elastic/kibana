/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';

export const getRedirectToTracesExplorerWaterfallPageUrl = ({
  rangeFrom,
  rangeTo,
  query,
}: {
  rangeFrom: string;
  rangeTo: string;
  query?: string;
}) => {
  return format({
    pathname: '/traces/explorer/waterfall',
    query: {
      rangeFrom,
      rangeTo,
      query,
    },
  });
};

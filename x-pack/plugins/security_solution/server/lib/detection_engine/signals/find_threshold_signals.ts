/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';

import { singleSearchAfter } from './single_search_after';

export const findThresholdSignals = async ({
  from,
  to,
  inputIndexPattern,
  services,
  logger,
  filter,
  threshold,
}: {}) => {
  const {
    searchResult,
    searchDuration,
  }: { searchResult: SignalSearchResponse; searchDuration: string } = await singleSearchAfter({
    index: inputIndexPattern,
    from,
    to,
    services,
    logger,
    filter,
    pageSize: 0,
    threshold,
  });
  return searchResult;
};

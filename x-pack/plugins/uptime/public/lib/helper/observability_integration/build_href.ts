/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ping } from '../../../../common/runtime_types';

/**
 * Builds URLs to the designated features by extracting values from the provided
 * monitor object on a given path. Then returns the result of a provided function
 * to place the value in its rightful place on the URI string.
 * @param summaryPings array of summary checks containing the data to extract
 * @param getData the location on the object of the desired data
 * @param getHref a function that returns the full URL
 */
export const buildHref = (
  summaryPings: Ping[],
  getData: (ping: Ping) => string | undefined,
  getHref: (value: string | string[] | undefined) => string | undefined
): string | undefined => {
  const queryValue = summaryPings
    .map((ping) => getData(ping))
    .filter((value: string | undefined) => value !== undefined);
  if (queryValue.length === 0) {
    return getHref(undefined);
  }
  // @ts-ignore the values will all be defined
  return queryValue.length === 1 ? getHref(queryValue[0]) : getHref(queryValue);
};

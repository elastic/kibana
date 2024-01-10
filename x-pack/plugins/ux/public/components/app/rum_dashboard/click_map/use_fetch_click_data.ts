/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface FetchClickDataParams {
  serviceName?: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
  minWidth: number;
  maxWidth: number;
  referenceWidth: number; // Width of the reference screenshot
  referenceHeight: number; // Height of the reference screenshot
}
export function useFetchClickData(params: FetchClickDataParams) {
  // Query coordinates while respecting serviceName, environment, rangeFrom, rangeTo
  // AND where coordinate.x respects minWidth and maxWidth

  // The fetching part should not react to referenceWidth and referenceHeight parameters so that if
  // only referenceWidth/referenceHeight change, already fetched coordinates are transformed

  // Project the coordinates according to referenceWidth and referenceHeight before returning

  return {};
}

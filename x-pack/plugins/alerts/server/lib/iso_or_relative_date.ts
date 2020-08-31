/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseDuration } from '../../common/parse_duration';

/**
 * Parse an ISO date or NNx duration string as a Date
 *
 * @param dateString an ISO date or NNx "duration" string representing now-duration
 * @returns a Date or undefined if the dateString was not valid
 */
export function parseIsoOrRelativeDate(dateString: string): Date | undefined {
  const epochMillis = Date.parse(dateString);
  if (!isNaN(epochMillis)) return new Date(epochMillis);

  let millis: number;
  try {
    millis = parseDuration(dateString);
  } catch (err) {
    return;
  }

  return new Date(Date.now() - millis);
}

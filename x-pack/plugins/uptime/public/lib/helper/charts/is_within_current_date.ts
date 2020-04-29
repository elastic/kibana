/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Test if the supplied date values fall entirely within the current date's span.
 * This function assumes that dateRangeStart is less than or equal to dateRangeEnd.
 * @param dateRangeStart the beginning value of the date range in milliseconds
 * @param dateRangeEnd the ending value of the date range in milliseconds
 * @example a range not contained by a single date
 * // Wednesday, July 18, 2001 5:39:39 PM
 * const from = 995477979000;
 * // Friday, July 20, 2001 5:39:39 PM
 * const to = 995650779000;
 * isWithinCurrentDate(from, to); // returns false
 * @example a range that is contained by a single date
 * // Friday, July 20, 2001 5:39:39 PM
 * const from = 995650779000;
 * // Friday, July 20, 2001 9:39:39 PM
 * const to = 995665179000;
 * isWithinCurrentDate(from, to); // returns true
 */
export const isWithinCurrentDate = (dateRangeStart: number, dateRangeEnd: number) => {
  const today = new Date(Date.now());
  const min = today.setHours(0, 0, 0, 0).valueOf();
  const max = today.setHours(23, 59, 59, 999).valueOf();
  return dateRangeStart > min && dateRangeStart < max && dateRangeEnd < max;
};

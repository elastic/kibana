/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns a dash ('-') if data is undefined, and empty string, or a NaN.
 *
 * Used by frontend components
 *
 * @param  {String | Number | undefined} data
 * @return {String | Number} either data itself or if invalid, a dash ('-')
 */
export const dataOrDash = (data: string | number | undefined): string | number => {
  if (data === undefined || data === '' || (typeof data === 'number' && isNaN(data))) {
    return '-';
  }

  return data;
};

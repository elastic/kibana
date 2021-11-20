/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Helper for checking a param's value is defined
 * @param param - anything
 * @param context {String} calling context used in the error message
 */
export function checkParam(param: any, context: string) {
  if (!param) {
    throw new MissingRequiredError(context);
  }
}

/* Constructor for custom error type used for:
 * - giving an error a stock message prefix
 * - verification in unit tests
 * see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
 */

export class MissingRequiredError extends Error {
  constructor(param: string) {
    super();
    this.name = 'MissingRequiredError';
    this.message = `Missing required parameter or field: ${param}`;
    this.stack = new Error().stack;
  }
}

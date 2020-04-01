/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Describes an error during rule building.
 * In addition to a user-"friendly" message, this also includes a rule trace,
 * which is the "JSON path" where the error occurred.
 */
export class RuleBuilderError extends Error {
  constructor(message: string, public readonly ruleTrace: string[]) {
    super(message);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, RuleBuilderError.prototype);
  }
}

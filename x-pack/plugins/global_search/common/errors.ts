/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// only one type for now, but already present for future-proof reasons
export type GlobalSearchFindErrorType = 'invalid-license';

/**
 * Error thrown from the {@link GlobalSearchPluginStart.find | GlobalSearch find API}'s result observable
 *
 * @public
 */
export class GlobalSearchFindError extends Error {
  public static invalidLicense(message: string) {
    return new GlobalSearchFindError('invalid-license', message);
  }

  private constructor(public readonly type: GlobalSearchFindErrorType, message: string) {
    super(message);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, GlobalSearchFindError.prototype);
  }
}

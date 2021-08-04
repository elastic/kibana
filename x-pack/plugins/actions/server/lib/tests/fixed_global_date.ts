/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Utility for jest tests.  It will whack the global Date object, so the date
// never changes.  Not uninstallable, but jest runs each test in a box so it
// won't affect other test modules.

export const mockedDateString = '2019-02-12T21:01:22.479Z';

export function setGlobalDate() {
  const mockedDate = new Date(mockedDateString);
  const DateOriginal = Date;
  // A version of date that responds to `new Date(null|undefined)` and `Date.now()`
  // by returning a fixed date, otherwise should be same as Date.
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  (global as any).Date = class Date {
    constructor(...args: unknown[]) {
      // sometimes the ctor has no args, sometimes has a single `null` arg
      if (args[0] == null) {
        // @ts-ignore
        return mockedDate;
      } else {
        // @ts-ignore
        return new DateOriginal(...args);
      }
    }
    static now() {
      return mockedDate.getTime();
    }
    static parse(string: string) {
      return DateOriginal.parse(string);
    }
    static UTC(string: string) {
      return mockedDate.getTime();
    }
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare module 'datemath-parser' {
  interface DateMath {
    parse(expression: string, now: number, roundUp: boolean, timeZone?: string): number;
  }
  const datemath: DateMath;
  export = datemath;
}

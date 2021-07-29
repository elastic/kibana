/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ace#define is not defined in the published types, so we define our own
 * interface.
 */
export interface AceInterface {
  define: (
    name: string,
    deps: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cb: (acequire: (name: string) => any, exports: any) => void
  ) => void;
}

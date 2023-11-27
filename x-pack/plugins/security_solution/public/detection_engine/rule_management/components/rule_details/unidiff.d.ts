/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare module 'unidiff' {
  export interface FormatOptions {
    context?: number;
  }

  export function diffLines(x: string, y: string): string[];

  export function formatLines(line: string[], options?: FormatOptions): string;
}

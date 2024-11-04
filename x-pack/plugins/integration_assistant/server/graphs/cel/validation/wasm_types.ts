/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare global {
  export interface Window {
    Go: any;
  }
  export function formatCelProgram(input: string): { Format?: string; Err?: string };
  export function stopFormatCelProgram(): void;
}
export {};

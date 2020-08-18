/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'kea' {
  export function useValues(logic?: object): object;
  export function useActions(logic?: object): object;
  export function getContext(): { store: object };
  export function resetContext(context: object): object;
  export function kea(logic: object): object;
}

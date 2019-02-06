/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// tslint:disable:variable-name

declare module 'rison-node' {
  export type RisonValue = null | boolean | number | string | RisonObject | RisonArray;

  export interface RisonArray extends Array<RisonValue> {}

  export interface RisonObject {
    [key: string]: RisonValue;
  }

  export const decode: (input: string) => RisonValue;

  export const decode_object: (input: string) => RisonObject;

  export const encode: <Input extends RisonValue>(input: Input) => string;

  export const encode_object: <Input extends RisonObject>(input: Input) => string;
}

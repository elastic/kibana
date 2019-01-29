/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type vector2d = [number, number, number] & ReadonlyArray<number> & { length: 3 };
export type transformMatrix2d = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
] &
  ReadonlyArray<number> & { length: 9 };

export type vector3d = [number, number, number, number] & ReadonlyArray<number> & { length: 4 };
export type transformMatrix3d = ReadonlyArray<number> & { length: 16 } & [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];

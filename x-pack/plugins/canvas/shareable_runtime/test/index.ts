/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore this file is too large for TypeScript, so it is excluded from our project config
import hello from './workpads/hello.json';
// @ts-ignore this file is too large for TypeScript, so it is excluded from our project config
import austin from './workpads/austin.json';
// @ts-ignore this file is too large for TypeScript, so it is excluded from our project config
import test from './workpads/test.json';

export * from './utils';

export type WorkpadNames = keyof typeof sharedWorkpads;
export const sharedWorkpads = {
  // TODO: the automatic types for these JSON files are insufficient, and "austin" is so massive
  // that Typescript refuses to type it. These should be converted to TypeScript and typed to fit
  // the requirements. "austin" should also be reduced to the necessary data
  hello: hello as any,
  austin: austin as any,
  test: test as any,
};

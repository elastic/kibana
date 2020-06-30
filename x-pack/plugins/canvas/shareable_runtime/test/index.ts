/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hello from './workpads/hello.json';
import austin from './workpads/austin.json';
import test from './workpads/test.json';

export * from './utils';

export type WorkpadNames = keyof typeof sharedWorkpads;
export const sharedWorkpads = { hello, austin, test };

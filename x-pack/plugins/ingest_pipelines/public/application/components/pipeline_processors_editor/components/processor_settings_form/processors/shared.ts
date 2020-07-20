/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { flow } from 'fp-ts/lib/function';

export const arrayOfStrings = rt.array(rt.string);
export const isArrayOfStrings = flow(arrayOfStrings.decode, isRight);

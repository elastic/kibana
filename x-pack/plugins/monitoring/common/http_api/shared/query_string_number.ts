/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const numberFromStringRT = new rt.Type<number, string, unknown>(
  'NumberFromString',
  rt.number.is,
  (value, context) => {
    const nb = parseInt(value as string, 10);
    return isNaN(nb) ? rt.failure(value, context) : rt.success(nb);
  },
  String
);

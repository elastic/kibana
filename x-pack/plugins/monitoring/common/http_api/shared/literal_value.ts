/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const createLiteralValueFromUndefinedRT = <LiteralValue extends string | number | boolean>(
  literalValue: LiteralValue
) =>
  rt.undefined.pipe(
    new rt.Type<LiteralValue, undefined, unknown>(
      'BooleanFromString',
      rt.literal(literalValue).is,
      (_value, _context) => rt.success(literalValue),
      () => undefined
    )
  );

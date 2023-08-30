/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SafeParseError, SafeParseReturnType, SafeParseSuccess } from 'zod';

export function expectParseError<Input, Output>(
  result: SafeParseReturnType<Input, Output>
): asserts result is SafeParseError<Input> {
  expect(result.success).toEqual(false);
}

export function expectParseSuccess<Input, Output>(
  result: SafeParseReturnType<Input, Output>
): asserts result is SafeParseSuccess<Output> {
  expect(result.success).toEqual(true);
}

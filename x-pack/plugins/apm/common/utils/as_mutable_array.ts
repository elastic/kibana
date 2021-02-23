/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function asMutableArray<T extends Readonly<any>>(
  arr: T
): T extends Readonly<[...infer U]> ? U : unknown[] {
  return arr as any;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fnOperationTypeMapping: Record<string, string> = {
  min: 'min',
  max: 'max',
  sum: 'sum',
  avg: 'average',
} as const;

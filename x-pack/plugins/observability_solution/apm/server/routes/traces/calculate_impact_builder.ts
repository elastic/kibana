/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function calculateImpactBuilder(sums?: Array<number | null>) {
  const sumValues = (sums ?? []).filter((value) => value !== null) as number[];

  const max = Math.max(...sumValues);
  const min = Math.min(...sumValues);

  return (sum: number) =>
    sum !== null && sum !== undefined
      ? ((sum - min) / (max - min)) * 100 || 0
      : 0;
}

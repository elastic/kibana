/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';

export function calcMemoryUsedRate({
  memoryFree,
  memoryTotal,
}: {
  memoryFree?: number | null;
  memoryTotal?: number | null;
}) {
  if (!isFiniteNumber(memoryFree) || !isFiniteNumber(memoryTotal)) {
    return undefined;
  }

  return (memoryTotal - memoryFree) / memoryTotal;
}

export function calcMemoryUsed({
  memoryFree,
  memoryTotal,
}: {
  memoryFree?: number | null;
  memoryTotal?: number | null;
}) {
  if (!isFiniteNumber(memoryFree) || !isFiniteNumber(memoryTotal)) {
    return undefined;
  }

  return memoryTotal - memoryFree;
}

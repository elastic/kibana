/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @deprecated use calculateThroughputWithRange instead
 */
export function calculateThroughput({
  start,
  end,
  value,
}: {
  start: number;
  end: number;
  value: number;
}) {
  const durationAsMinutes = (end - start) / 1000 / 60;
  return value / durationAsMinutes;
}

export function calculateThroughputWithRange({
  start,
  end,
  value,
}: {
  start: number;
  end: number;
  value: number;
}) {
  const durationAsMinutes = (end - start) / 1000 / 60;
  return value / durationAsMinutes;
}

export function calculateThroughputWithInterval({
  bucketSize,
  value,
}: {
  bucketSize: number;
  value: number;
}) {
  const durationAsMinutes = bucketSize / 60;
  return value / durationAsMinutes;
}

export type ThroughputUnit = 'minute' | 'second';
export function getThroughputUnit(bucketSize: number): ThroughputUnit {
  return bucketSize >= 60 ? 'minute' : 'second';
}

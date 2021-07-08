/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Throughput {
  value: number;
  unit: 'second' | 'minute';
}
type Options = {
  // doc count
  count: number;

  // unit to use (seconds or minutes)
  unit: Throughput['unit'] | 'auto';
} & (
  | {
      // timerange start in milliseconds
      start: number;

      // timerange end in milliseconds
      end: number;
    }
  | {
      // timerange duration in seconds
      bucketSize: number;
    }
);

export function calculateThroughput(options: Options): Throughput {
  const bucketSizeInSeconds =
    'bucketSize' in options
      ? // bucketSize is specified in seconds
        options.bucketSize
      : // time range is specified in milliseconds
        (options.end - options.start) / 1000;

  const throughputPerSecond = options.count / bucketSizeInSeconds;
  const unit =
    options.unit === 'auto'
      ? getThroughputUnit(bucketSizeInSeconds)
      : options.unit;

  const value =
    unit === 'minute' ? throughputPerSecond * 60 : throughputPerSecond;

  return { value, unit };
}

export function getThroughputUnit(
  bucketSizeInSeconds: number
): Throughput['unit'] {
  return bucketSizeInSeconds > 60 ? 'minute' : 'second';
}

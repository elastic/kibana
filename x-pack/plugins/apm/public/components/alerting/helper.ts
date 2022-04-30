/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';

export interface AlertMetadata {
  environment: string;
  serviceName?: string;
  transactionType?: string;
  start?: string;
  end?: string;
}

export type TimeUnit = 's' | 'm' | 'h' | 'd';

const BUCKET_SIZE = 20;

export function getIntervalAndTimeRange({
  windowSize,
  windowUnit,
}: {
  windowSize: number;
  windowUnit: TimeUnit;
}) {
  const end = Date.now();
  const start =
    end -
    moment.duration(windowSize, windowUnit).asMilliseconds() * BUCKET_SIZE;

  return {
    interval: `${windowSize}${windowUnit}`,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}

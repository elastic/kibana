/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';

export interface AlertMetadata {
  environment: string;
  serviceName?: string;
  transactionType?: string;
  start?: string;
  end?: string;
}

export function getAbsoluteTimeRange(windowSize: number, windowUnit: string) {
  const now = new Date().toISOString();

  return {
    start:
      datemath.parse(`now-${windowSize}${windowUnit}`)?.toISOString() ?? now,
    end: now,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';

export const timeRangeSchema = {
  start: {
    type: 'string' as const,
    description: 'The start of the time range, in Elasticsearch date math, like `now`.',
  },
  end: {
    type: 'string' as const,
    description: 'The end of the time range, in Elasticsearch date math, like `now-24h`.',
  },
};

export function parseTimeRangeFromSchema({ start, end }: { start: string; end: string }) {
  const startMs = datemath.parse(start)?.valueOf()!;
  const endMs = datemath.parse(end)?.valueOf()!;

  return {
    start: startMs,
    end: endMs,
  };
}

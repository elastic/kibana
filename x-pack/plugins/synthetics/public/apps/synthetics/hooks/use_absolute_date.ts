/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { useMemo } from 'react';
import { useSyntheticsRefreshContext } from '../contexts';

export function useAbsoluteDate({ from, to }: { from: string; to: string }) {
  const { lastRefresh } = useSyntheticsRefreshContext();
  return useMemo(
    () => ({
      from: datemath.parse(from)?.toISOString() ?? from,
      to: datemath.parse(to, { roundUp: true })?.toISOString() ?? to,
    }),
    // we want to recompute these any time the app refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to, lastRefresh]
  );
}

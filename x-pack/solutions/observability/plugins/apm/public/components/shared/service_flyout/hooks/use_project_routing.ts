/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { ProjectRouting } from '@kbn/es-query';
import { getApmInternalServices } from '../../../../plugin';

/**
 * Current CPS (cross-project search) project routing, kept in sync with picker changes.
 *
 * Reads the `cpsManager` from the APM internal services singleton (only set when the APM
 * CPS feature flag is enabled), so it works regardless of which host renders the flyout
 * (APM service map, contextual map, or the discoverShared feature). Returns `undefined`
 * when CPS is disabled or the routing is unresolved.
 */
export function useProjectRouting(): ProjectRouting | undefined {
  const cpsManager = getApmInternalServices()?.cpsManager;
  return useObservable(
    useMemo(() => cpsManager?.getProjectRouting$() ?? of(undefined), [cpsManager]),
    cpsManager?.getProjectRouting()
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Observable,
  Subject,
  from,
  merge,
  firstValueFrom,
  connectable,
  ReplaySubject,
} from 'rxjs';

import { filter, map, pairwise, exhaustMap, share, takeUntil, finalize } from 'rxjs/operators';
import { hasLicenseInfoChanged } from './has_license_info_changed';
import type { ILicense } from './types';

export function createLicenseUpdate(
  triggerRefresh$: Observable<unknown>,
  stop$: Observable<unknown>,
  fetcher: () => Promise<ILicense>,
  initialValues?: ILicense
) {
  const manuallyRefresh$ = new Subject<void>();

  const fetched$ = merge(triggerRefresh$, manuallyRefresh$).pipe(
    takeUntil(stop$),
    exhaustMap(fetcher),
    share()
  );

  const cached$ = connectable(fetched$, { connector: () => new ReplaySubject(1) });

  const cachedSubscription = cached$.connect(); // start periodic license fetch right away

  stop$
    .pipe(
      finalize(() => {
        manuallyRefresh$.complete();
        cachedSubscription.unsubscribe();
      })
    )
    .subscribe();

  const initialValues$ = initialValues ? from([undefined, initialValues]) : from([undefined]);

  const license$: Observable<ILicense> = merge(initialValues$, cached$).pipe(
    pairwise(),
    filter(([previous, next]) => hasLicenseInfoChanged(previous, next!)),
    map(([, next]) => next!)
  );

  return {
    license$,
    refreshManually() {
      const licensePromise = firstValueFrom(fetched$);
      manuallyRefresh$.next();
      return licensePromise;
    },
  };
}

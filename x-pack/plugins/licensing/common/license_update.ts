/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Observable, Subject, merge, firstValueFrom } from 'rxjs';

import {
  filter,
  map,
  pairwise,
  exhaustMap,
  share,
  shareReplay,
  takeUntil,
  finalize,
  startWith,
} from 'rxjs/operators';
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

  // provide a first, empty license, so that we can compare in the filter below
  const startWithArgs = initialValues ? [undefined, initialValues] : [undefined];

  const license$: Observable<ILicense> = fetched$.pipe(
    startWith(...startWithArgs),
    pairwise(),
    filter(([previous, next]) => hasLicenseInfoChanged(previous, next!)),
    map(([, next]) => next!),
    shareReplay(1)
  );

  // start periodic license fetch right away
  const licenseSub = license$.subscribe();

  stop$
    .pipe(
      finalize(() => {
        manuallyRefresh$.complete();
        licenseSub.unsubscribe();
      })
    )
    .subscribe();

  return {
    license$,
    refreshManually() {
      const licensePromise = firstValueFrom(fetched$);
      manuallyRefresh$.next();
      return licensePromise;
    },
  };
}

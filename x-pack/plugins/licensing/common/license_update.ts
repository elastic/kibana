/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectableObservable, Observable, Subject, from, merge, firstValueFrom } from 'rxjs';

import { filter, map, pairwise, exhaustMap, publishReplay, share, takeUntil } from 'rxjs/operators';
import { hasLicenseInfoChanged } from './has_license_info_changed';
import { ILicense } from './types';

export function createLicenseUpdate(
  triggerRefresh$: Observable<unknown>,
  stop$: Observable<unknown>,
  fetcher: () => Promise<ILicense>,
  initialValues?: ILicense
) {
  const manuallyRefresh$ = new Subject<void>();
  const fetched$ = merge(triggerRefresh$, manuallyRefresh$).pipe(exhaustMap(fetcher), share());

  const cached$ = fetched$.pipe(
    takeUntil(stop$),
    publishReplay(1)
    // have to cast manually as pipe operator cannot return ConnectableObservable
    // https://github.com/ReactiveX/rxjs/issues/2972
  ) as ConnectableObservable<ILicense>;

  const cachedSubscription = cached$.connect();
  stop$.subscribe({ complete: () => cachedSubscription.unsubscribe() });

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

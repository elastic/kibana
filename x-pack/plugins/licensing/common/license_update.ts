/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConnectableObservable, Observable, Subject, from, merge } from 'rxjs';

import { filter, map, pairwise, switchMap, publishReplay, takeUntil } from 'rxjs/operators';
import { hasLicenseInfoChanged } from './has_license_info_changed';
import { ILicense } from './types';

export function createLicenseUpdate(
  trigger$: Observable<unknown>,
  stop$: Observable<unknown>,
  fetcher: () => Promise<ILicense>,
  initialValues?: ILicense
) {
  const triggerRefresh$ = trigger$.pipe(switchMap(fetcher));
  const manuallyFetched$ = new Subject<ILicense>();

  const fetched$ = merge(triggerRefresh$, manuallyFetched$).pipe(
    takeUntil(stop$),
    publishReplay(1)
    // have to cast manually as pipe operator cannot return ConnectableObservable
    // https://github.com/ReactiveX/rxjs/issues/2972
  ) as ConnectableObservable<ILicense>;

  const fetchSubscription = fetched$.connect();
  stop$.subscribe({ complete: () => fetchSubscription.unsubscribe() });

  const initialValues$ = initialValues ? from([undefined, initialValues]) : from([undefined]);

  const license$: Observable<ILicense> = merge(initialValues$, fetched$).pipe(
    pairwise(),
    filter(([previous, next]) => hasLicenseInfoChanged(previous, next!)),
    map(([, next]) => next!)
  );

  return {
    license$,
    async refreshManually() {
      const license = await fetcher();
      manuallyFetched$.next(license);
      return license;
    },
  };
}

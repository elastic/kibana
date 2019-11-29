/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConnectableObservable, Observable, from, merge } from 'rxjs';

import { filter, map, pairwise, switchMap, publishReplay } from 'rxjs/operators';
import { hasLicenseInfoChanged } from './has_license_info_changed';
import { ILicense } from './types';

export function createLicenseUpdate(
  trigger$: Observable<unknown>,
  fetcher: () => Promise<ILicense>,
  initialValues?: ILicense
) {
  const fetched$ = trigger$.pipe(
    switchMap(fetcher),
    publishReplay(1)
    // have to cast manually as pipe operator cannot return ConnectableObservable
    // https://github.com/ReactiveX/rxjs/issues/2972
  ) as ConnectableObservable<ILicense>;

  const fetchSubscription = fetched$.connect();

  const initialValues$ = initialValues ? from([undefined, initialValues]) : from([undefined]);

  const update$: Observable<ILicense> = merge(initialValues$, fetched$).pipe(
    pairwise(),
    filter(([previous, next]) => hasLicenseInfoChanged(previous, next!)),
    map(([, next]) => next!)
  );

  return {
    update$,
    fetchSubscription,
  };
}

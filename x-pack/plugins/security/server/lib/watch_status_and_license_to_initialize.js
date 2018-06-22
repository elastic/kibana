/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

export function watchStatusAndLicenseToInitialize(xpackMainPlugin, downstreamPlugin, initialize) {
  const xpackInfo = xpackMainPlugin.info;
  const xpackInfoFeature = xpackInfo.feature(downstreamPlugin.id);

  const upstreamStatus = xpackMainPlugin.status;
  const currentStatus$ = Rx.of({
    state: upstreamStatus.state,
    message: upstreamStatus.message,
  });
  const newStatus$ = Rx.fromEvent(upstreamStatus, 'change', null, (previousState, previousMsg, state, message) => {
    return {
      state,
      message,
    };
  });
  const status$ = Rx.merge(currentStatus$, newStatus$);

  const currentLicense$ = Rx.of(xpackInfoFeature.getLicenseCheckResults());
  const newLicense$ = Rx.fromEventPattern(xpackInfo.onLicenseInfoChange.bind(xpackInfo))
    .pipe(map(() => xpackInfoFeature.getLicenseCheckResults()));
  const license$ = Rx.merge(currentLicense$, newLicense$);

  Rx.combineLatest(status$, license$)
    .pipe(
      map(([status, license]) => ({ status, license })),
      switchMap(({ status, license }) => {
        if (status.state !== 'green') {
          return Rx.of({ state: status.state, message: status.message });
        }

        return initialize(license)
          .then(() => ({
            state: 'green',
            message: 'Ready',
          }))
          .catch((err) => ({
            state: 'red',
            message: err.message
          }));
      }),
      tap(({ state, message }) => {
        downstreamPlugin.status[state](message);
      })
    )
    .subscribe();
}

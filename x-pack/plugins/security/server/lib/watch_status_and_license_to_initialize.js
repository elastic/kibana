/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';

export function watchStatusAndLicenseToInitialize(xpackMainPlugin, downstreamPlugin, onGreen) {
  const xpackInfo = xpackMainPlugin.info;
  const xpackInfoFeature = xpackInfo.feature(downstreamPlugin.id);

  const upstreamStatus = xpackMainPlugin.status;
  const currentStatus$ = Observable
    .of({
      state: upstreamStatus.state,
      message: upstreamStatus.message,
    });
  const newStatus$ = Observable
    .fromEvent(upstreamStatus, 'change', null, (previousState, previousMsg, state, message) => {
      return {
        state,
        message,
      };
    });
  const status$ = Observable.merge(currentStatus$, newStatus$);

  const currentLicense$ = Observable
    .of(xpackInfoFeature.getLicenseCheckResults());
  const newLicense$ = Observable
    .fromEventPattern(xpackInfoFeature.registerLicenseChangeCallback)
    .map(() => xpackInfoFeature.getLicenseCheckResults());
  const license$ = Observable.merge(currentLicense$, newLicense$);

  Observable.combineLatest(status$, license$)
    .map(([status, license]) => ({ status, license }))
    .switchMap(({ status, license }) => {
      if (status.state !== 'green') {
        return Observable.of({ state: status.state, message: status.message });
      }

      return onGreen(license)
        .then(() => ({
          state: 'green',
          message: 'Ready',
        }))
        .catch((err) => ({
          state: 'red',
          message: err.message
        }));
    })
    .do(({ state, message }) => {
      downstreamPlugin.status[state](message);
    })
    .subscribe();
}

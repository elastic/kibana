/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, type Observable, shareReplay, timer, startWith } from 'rxjs';

/**
 * Returns an observable indicating whether the Cloud Organization is still in trial
 * @param trialEndDate The date the trial ends
 */
export function inTrialObservable(trialEndDate: Date): Observable<boolean> {
  return timer(trialEndDate).pipe(
    map(() => false),
    startWith(inTrial(trialEndDate)),
    shareReplay(1)
  );
}

/**
 * Is trial end date due?
 * @param trialEndDate The date the trial ends
 * @remark Elastic Cloud allows customers to end their trials earlier or even extend it in some cases, but this is a good compromise for now.
 */
function inTrial(trialEndDate: Date): boolean {
  return Date.now() <= trialEndDate.getTime();
}

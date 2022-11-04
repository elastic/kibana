/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, type Observable, shareReplay } from 'rxjs';

export interface IsPayingOptions {
  inTrial$: Observable<boolean>;
  isElasticStaffOwned: boolean;
}

/**
 * Returns an observable indicating if the Elastic Cloud Organization is a paying customer
 * @param inTrial$ The in trial observable
 * @param isElasticStaffOwned If the organization belongs to an Elastician
 */
export function isPayingObservable({
  inTrial$,
  isElasticStaffOwned,
}: IsPayingOptions): Observable<boolean> {
  return inTrial$.pipe(
    // If the organization is in trial or belongs to an Elastician, we don't consider them as paying customers.
    map((inTrial) => !(inTrial || isElasticStaffOwned)),
    shareReplay(1)
  );
}

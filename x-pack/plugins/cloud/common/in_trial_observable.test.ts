/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fakeSchedulers } from 'rxjs-marbles/jest';
import { firstValueFrom } from 'rxjs';
import { inTrialObservable } from './in_trial_observable';

describe('inTrialObservable', () => {
  beforeEach(() => jest.useFakeTimers());

  test('it emits the inTrial value as soon as the observable is created', async () => {
    const inTrial$ = inTrialObservable(new Date(Date.now() + 120000));
    await expect(firstValueFrom(inTrial$)).resolves.toEqual(true);
  });

  test(
    'it emits true initially and then false after the expiry date',
    fakeSchedulers(async (advance) => {
      const inTrial$ = inTrialObservable(new Date(Date.now() + 120000));
      await expect(firstValueFrom(inTrial$)).resolves.toEqual(true);
      advance(120000);
      await expect(firstValueFrom(inTrial$)).resolves.toEqual(false);
    })
  );

  test(
    'it emits false because the trialEndDate is in the past',
    fakeSchedulers(async (advance) => {
      const inTrial$ = inTrialObservable(new Date(Date.now() - 120000));
      await expect(firstValueFrom(inTrial$)).resolves.toEqual(false);
      advance(120000);
      await expect(firstValueFrom(inTrial$)).resolves.toEqual(false);
    })
  );
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { ILicense, LicenseType } from './types';
import { createLicenseUpdate } from './license_update';
import { licenseMock } from './license.mock';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('licensing update', () => {
  it('loads updates when triggered', async () => {
    const types: LicenseType[] = ['basic', 'gold'];

    const trigger$ = new Subject();
    const fetcher = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(licenseMock.create({ license: { type: types.shift() } }))
      );

    const { update$ } = createLicenseUpdate(trigger$, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(0);

    trigger$.next();
    const first = await update$.pipe(take(1)).toPromise();
    expect(first.type).toBe('basic');

    trigger$.next();
    const [, second] = await update$.pipe(take(2), toArray()).toPromise();
    expect(second.type).toBe('gold');
  });

  it('starts with initial value if presents', async () => {
    const initialLicense = licenseMock.create({ license: { type: 'platinum' } });
    const fetchedLicense = licenseMock.create({ license: { type: 'gold' } });
    const trigger$ = new Subject();

    const fetcher = jest.fn().mockResolvedValue(fetchedLicense);
    const { update$ } = createLicenseUpdate(trigger$, fetcher, initialLicense);
    trigger$.next();
    const [first, second] = await update$.pipe(take(2), toArray()).toPromise();

    expect(first.type).toBe('platinum');
    expect(second.type).toBe('gold');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not emit if license has not changed', async () => {
    const trigger$ = new Subject();

    let i = 0;
    const fetcher = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          ++i < 3 ? licenseMock.create() : licenseMock.create({ license: { type: 'gold' } })
        )
      );

    const { update$ } = createLicenseUpdate(trigger$, fetcher);
    trigger$.next();

    const [first] = await update$.pipe(take(1), toArray()).toPromise();

    expect(first.type).toBe('basic');

    trigger$.next();
    trigger$.next();

    const [, second] = await update$.pipe(take(2), toArray()).toPromise();

    expect(second.type).toBe('gold');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('new subscriptions does not force re-fetch', async () => {
    const trigger$ = new Subject();

    const fetcher = jest.fn().mockResolvedValue(licenseMock.create());

    const { update$ } = createLicenseUpdate(trigger$, fetcher);

    update$.subscribe(() => {});
    update$.subscribe(() => {});
    update$.subscribe(() => {});
    trigger$.next();

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('handles fetcher race condition', async () => {
    const delayMs = 100;
    let firstCall = true;
    const fetcher = jest.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          if (firstCall) {
            firstCall = false;
            setTimeout(() => resolve(licenseMock.create()), delayMs);
          } else {
            resolve(licenseMock.create({ license: { type: 'gold' } }));
          }
        })
    );
    const trigger$ = new Subject();
    const { update$ } = createLicenseUpdate(trigger$, fetcher);
    const values: ILicense[] = [];
    update$.subscribe(license => values.push(license));

    trigger$.next();
    trigger$.next();

    await delay(delayMs * 2);

    await expect(fetcher).toHaveBeenCalledTimes(2);
    await expect(values).toHaveLength(1);
    await expect(values[0].type).toBe('gold');
  });

  it('completes update$ stream when trigger is completed', () => {
    const trigger$ = new Subject();
    const fetcher = jest.fn().mockResolvedValue(licenseMock.create());

    const { update$ } = createLicenseUpdate(trigger$, fetcher);
    let completed = false;
    update$.subscribe({ complete: () => (completed = true) });

    trigger$.complete();
    expect(completed).toBe(true);
  });

  it('stops fetching when fetch subscription unsubscribed', () => {
    const trigger$ = new Subject();
    const fetcher = jest.fn().mockResolvedValue(licenseMock.create());

    const { update$, fetchSubscription } = createLicenseUpdate(trigger$, fetcher);
    const values: ILicense[] = [];
    update$.subscribe(license => values.push(license));

    fetchSubscription.unsubscribe();
    trigger$.next();

    expect(fetcher).toHaveBeenCalledTimes(0);
  });
});

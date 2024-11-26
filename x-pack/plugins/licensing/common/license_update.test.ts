/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, Subject, type Observable } from 'rxjs';
import { take, toArray } from 'rxjs';

import { ILicense } from './types';
import { createLicenseUpdate } from './license_update';
import { licenseMock } from './licensing.mock';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const stop$ = new Subject<void>();
const maxRetryDelay = 30 * 1000;
describe('licensing update', () => {
  it('loads updates when triggered', async () => {
    const trigger$ = new Subject<void>();
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(licenseMock.createLicense({ license: { type: 'basic' } }))
      .mockResolvedValueOnce(licenseMock.createLicense({ license: { type: 'gold' } }));

    const { license$ } = createLicenseUpdate(trigger$, stop$, fetcher, maxRetryDelay);

    expect(fetcher).toHaveBeenCalledTimes(0);

    trigger$.next();
    const first = await firstValueFrom(license$);
    expect(first.type).toBe('basic');

    trigger$.next();
    const [, second] = await firstValueFrom(license$.pipe(take(2), toArray()));
    expect(second.type).toBe('gold');
  });

  it('starts with initial value if presents', async () => {
    const initialLicense = licenseMock.createLicense({ license: { type: 'platinum' } });
    const fetchedLicense = licenseMock.createLicense({ license: { type: 'gold' } });
    const trigger$ = new Subject<void>();

    const fetcher = jest.fn().mockResolvedValue(fetchedLicense);
    const { license$ } = createLicenseUpdate(
      trigger$,
      stop$,
      fetcher,
      maxRetryDelay,
      initialLicense
    );
    trigger$.next();
    const [first, second] = await firstValueFrom(license$.pipe(take(2), toArray()));

    expect(first.type).toBe('platinum');
    expect(second.type).toBe('gold');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not emit if license has not changed', async () => {
    const trigger$ = new Subject<void>();

    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(licenseMock.createLicense())
      .mockResolvedValueOnce(licenseMock.createLicense())
      .mockResolvedValueOnce(licenseMock.createLicense({ license: { type: 'gold' } }));

    const { license$ } = createLicenseUpdate(trigger$, stop$, fetcher, maxRetryDelay);
    trigger$.next();

    const [first] = await firstValueFrom(license$.pipe(take(1), toArray()));

    expect(first.type).toBe('basic');

    trigger$.next();

    await Promise.resolve();
    trigger$.next();

    const [, second] = await firstValueFrom(license$.pipe(take(2), toArray()));

    expect(second.type).toBe('gold');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('new subscriptions does not force re-fetch', async () => {
    const trigger$ = new Subject<void>();

    const fetcher = jest.fn().mockResolvedValue(licenseMock.createLicense());

    const { license$ } = createLicenseUpdate(trigger$, stop$, fetcher, maxRetryDelay);

    license$.subscribe(() => {});
    license$.subscribe(() => {});
    license$.subscribe(() => {});
    trigger$.next();

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('ignores trigger if license fetching is delayed ', async () => {
    const delayMs = 100;
    const fetcher = jest.fn().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve(licenseMock.createLicense({ license: { type: 'gold' } })),
            delayMs
          );
        })
    );
    const trigger$ = new Subject<void>();
    const { license$ } = createLicenseUpdate(trigger$, stop$, fetcher, maxRetryDelay);
    const values: ILicense[] = [];
    license$.subscribe((license) => values.push(license));

    trigger$.next();
    trigger$.next();

    await delay(delayMs * 2);

    await expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(values).toHaveLength(1);
    await expect(values[0].type).toBe('gold');
  });

  it('completes license$ stream when stop$ is triggered', () => {
    const trigger$ = new Subject<void>();
    const fetcher = jest.fn().mockResolvedValue(licenseMock.createLicense());

    const { license$ } = createLicenseUpdate(trigger$, stop$, fetcher, maxRetryDelay);
    let completed = false;
    license$.subscribe({ complete: () => (completed = true) });

    stop$.next();
    expect(completed).toBe(true);
  });

  it('stops fetching when stop$ is triggered', () => {
    const trigger$ = new Subject<void>();
    const fetcher = jest.fn().mockResolvedValue(licenseMock.createLicense());

    const { license$ } = createLicenseUpdate(trigger$, stop$, fetcher, maxRetryDelay);
    const values: ILicense[] = [];
    license$.subscribe((license) => values.push(license));

    stop$.next();
    trigger$.next();

    expect(fetcher).toHaveBeenCalledTimes(0);
  });

  it(`refreshManually multiple times gets new license`, async () => {
    const trigger$ = new Subject<void>();
    const firstLicense = licenseMock.createLicense({ license: { uid: 'first', type: 'basic' } });
    const secondLicense = licenseMock.createLicense({ license: { uid: 'second', type: 'gold' } });

    const fetcher = jest
      .fn()
      .mockImplementationOnce(async () => {
        await delay(2);
        return firstLicense;
      })
      .mockImplementationOnce(async () => {
        await delay(2);
        return secondLicense;
      });

    const { license$, refreshManually } = createLicenseUpdate(
      trigger$,
      stop$,
      fetcher,
      maxRetryDelay
    );
    let fromObservable;
    license$.subscribe((license) => (fromObservable = license));

    const licenseResult = await refreshManually();
    expect(licenseResult.uid).toBe('first');
    expect(licenseResult).toBe(fromObservable);

    const secondResult = await refreshManually();
    expect(secondResult.uid).toBe('second');
    expect(secondResult).toBe(fromObservable);
  });

  describe('exponential backoff behavior working as expected (1s, 2s, 4s, ...)', () => {
    let trigger$: Subject<void>;
    let stop$: Subject<void>;
    let license: ILicense;
    let fetcher: jest.Mock;
    let values: ILicense[];
    let license$: Observable<ILicense>;
    const offset = 100;

    beforeAll(() => {
      jest.useFakeTimers();

      trigger$ = new Subject<void>();
      stop$ = new Subject<void>();
      license = licenseMock.createLicense({ license: { type: 'basic' } });
      values = [];

      const fetcherFuncWithError = async () => {
        throw Error('forced error');
      };
      fetcher = jest.fn().mockImplementation(fetcherFuncWithError);

      const result = createLicenseUpdate(trigger$, stop$, fetcher, maxRetryDelay);
      license$ = result.license$;
      license$.subscribe((license) => values.push(license));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    const advanceTimeAndCheck = async (timeToAdvance: number, expectedCallCount: number) => {
      await jest.advanceTimersByTimeAsync(timeToAdvance);
      expect(fetcher).toHaveBeenCalledTimes(expectedCallCount);
    };

    it('fetcher has no calls initially, async () => {
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('calls fetcher after trigger', async () => {
      trigger$.next();
      await advanceTimeAndCheck(offset, 1);
    });

    it('retries after 1 second', async () => {
      await advanceTimeAndCheck(1000 + offset, 2);
    });

    it('retries after 2 seconds', async () => {
      await advanceTimeAndCheck(2 * 1000 + offset, 3);
    });

    it('retries after 4 seconds', async () => {
      await advanceTimeAndCheck(4 * 1000 + offset, 4);
    });

    it('retries after 8 seconds', async () => {
      await advanceTimeAndCheck(8 * 1000 + offset, 5);
    });

    it('another trigger now should have no effect thanks to the exhaustMap', async () => {
      trigger$.next();
      await advanceTimeAndCheck(offset, 5);
    });

    it('retries after 16 seconds', async () => {
      await advanceTimeAndCheck(16 * 1000 + offset, 6);
    });

    it('shouldnt retry anymore because 32 seconds goes over the maxRetryDelay', async () => {
      await advanceTimeAndCheck(32 * 1000 + offset, 6);
    });

    it('calls fetcher after new trigger', async () => {
      trigger$.next();
      await advanceTimeAndCheck(offset, 7);
    });

    it('retries after 1 second again', async () => {
      await advanceTimeAndCheck(1000 + offset, 8);
    });

    it('succeeds after 2 seconds', async () => {
      expect(values).toHaveLength(0);

      fetcher.mockImplementationOnce(async () => license);
      await advanceTimeAndCheck(2 * 1000 + offset, 9);

      expect(values).toHaveLength(1);
      expect(values[0].type).toBe('basic');
    });
  });
});

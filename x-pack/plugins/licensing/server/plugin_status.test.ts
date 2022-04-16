/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestScheduler } from 'rxjs/testing';
import { ServiceStatusLevels } from '@kbn/core/server';
import { licenseMock } from '../common/licensing.mock';
import { getPluginStatus$ } from './plugin_status';
import { ILicense } from '../common/types';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

const degradedStatus = {
  level: ServiceStatusLevels.degraded,
  summary: expect.any(String),
};
const availableStatus = {
  level: ServiceStatusLevels.available,
  summary: expect.any(String),
};
const unavailableStatus = {
  level: ServiceStatusLevels.unavailable,
  summary: expect.any(String),
};

describe('getPluginStatus$', () => {
  it('emits an initial `degraded` status', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const license$ = hot<ILicense>('|');
      const stop$ = hot<void>('');
      const expected = '(a|)';

      expectObservable(getPluginStatus$(license$, stop$)).toBe(expected, {
        a: degradedStatus,
      });
    });
  });

  it('emits an `available` status once the license emits', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const license$ = hot<ILicense>('--a', {
        a: licenseMock.createLicenseMock(),
      });
      const stop$ = hot<void>('');
      const expected = 'a-b';

      expectObservable(getPluginStatus$(license$, stop$)).toBe(expected, {
        a: degradedStatus,
        b: availableStatus,
      });
    });
  });

  it('emits an `unavailable` status if the license emits an error', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const errorLicense = licenseMock.createLicenseMock();
      errorLicense.error = 'some-error';

      const license$ = hot<ILicense>('--a', {
        a: errorLicense,
      });
      const stop$ = hot<void>('');
      const expected = 'a-b';

      expectObservable(getPluginStatus$(license$, stop$)).toBe(expected, {
        a: degradedStatus,
        b: unavailableStatus,
      });
    });
  });

  it('can emit `available` after `unavailable`', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const errorLicense = licenseMock.createLicenseMock();
      errorLicense.error = 'some-error';
      const validLicense = licenseMock.createLicenseMock();

      const license$ = hot<ILicense>('--a--b', {
        a: errorLicense,
        b: validLicense,
      });
      const stop$ = hot<void>('');
      const expected = 'a-b--c';

      expectObservable(getPluginStatus$(license$, stop$)).toBe(expected, {
        a: degradedStatus,
        b: unavailableStatus,
        c: availableStatus,
      });
    });
  });

  it('closes when `stop$` emits', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const license$ = hot<ILicense>('--a--b', {
        a: licenseMock.createLicenseMock(),
        b: licenseMock.createLicenseMock(),
      });
      const stop$ = hot<void>('----a', { a: undefined });
      const expected = 'a-b-|';

      expectObservable(getPluginStatus$(license$, stop$)).toBe(expected, {
        a: degradedStatus,
        b: availableStatus,
      });
    });
  });
});

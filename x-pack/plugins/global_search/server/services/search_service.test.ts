/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { duration } from 'moment';
import { httpServiceMock, httpServerMock, coreMock } from '../../../../../src/core/server/mocks';
import { licenseCheckerMock } from '../../common/license_checker.mock';
import { GlobalSearchProviderResult } from '../../common/types';
import { GlobalSearchFindError } from '../../common/errors';
import { GlobalSearchConfigType } from '../config';
import { GlobalSearchResultProvider } from '../types';
import { SearchService } from './search_service';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

describe('SearchService', () => {
  let service: SearchService;
  let basePath: ReturnType<typeof httpServiceMock.createBasePath>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let licenseChecker: ReturnType<typeof licenseCheckerMock.create>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  const createConfig = (timeoutMs: number = 30000): GlobalSearchConfigType => {
    return {
      search_timeout: duration(timeoutMs),
    };
  };

  const createProvider = (
    id: string,
    source: Observable<GlobalSearchProviderResult[]> = of([])
  ): jest.Mocked<GlobalSearchResultProvider> => ({
    id,
    find: jest.fn().mockImplementation((term, options, context) => source),
  });

  const expectedResult = (id: string) => expect.objectContaining({ id });

  const expectedBatch = (...ids: string[]) => ({
    results: ids.map((id) => expectedResult(id)),
  });

  const result = (
    id: string,
    parts: Partial<GlobalSearchProviderResult> = {}
  ): GlobalSearchProviderResult => ({
    title: id,
    type: 'test',
    url: '/foo/bar',
    score: 100,
    ...parts,
    id,
  });

  beforeEach(() => {
    service = new SearchService();
    basePath = httpServiceMock.createBasePath();
    basePath.prepend.mockImplementation((path) => `/base-path${path}`);
    coreStart = coreMock.createStart();
    licenseChecker = licenseCheckerMock.create();
  });

  describe('#setup()', () => {
    describe('#registerResultProvider()', () => {
      it('throws when trying to register the same provider twice', () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
          basePath,
        });

        const provider = createProvider('A');
        registerResultProvider(provider);
        expect(() => {
          registerResultProvider(provider);
        }).toThrowErrorMatchingInlineSnapshot(`"trying to register duplicate provider: A"`);
      });
    });
  });

  describe('#start()', () => {
    describe('#find()', () => {
      it('calls the provider with the correct parameters', () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
          basePath,
        });

        const provider = createProvider('A');
        registerResultProvider(provider);

        const { find } = service.start({ core: coreStart, licenseChecker });
        find('foobar', { preference: 'pref' }, request);

        expect(provider.find).toHaveBeenCalledTimes(1);
        expect(provider.find).toHaveBeenCalledWith(
          'foobar',
          expect.objectContaining({ preference: 'pref' }),
          expect.objectContaining({ core: expect.any(Object) })
        );
      });

      it('return the results from the provider', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
          basePath,
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const providerResults = hot('a-b-|', {
            a: [result('1')],
            b: [result('2')],
          });
          registerResultProvider(createProvider('A', providerResults));

          const { find } = service.start({ core: coreStart, licenseChecker });
          const results = find('foo', {}, request);

          expectObservable(results).toBe('a-b-|', {
            a: expectedBatch('1'),
            b: expectedBatch('2'),
          });
        });
      });

      it('handles multiple providers', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
          basePath,
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          registerResultProvider(
            createProvider(
              'A',
              hot('a---d-|', {
                a: [result('A1'), result('A2')],
                d: [result('A3')],
              })
            )
          );
          registerResultProvider(
            createProvider(
              'B',
              hot('-b-c|  ', {
                b: [result('B1')],
                c: [result('B2'), result('B3')],
              })
            )
          );

          const { find } = service.start({ core: coreStart, licenseChecker });
          const results = find('foo', {}, request);

          expectObservable(results).toBe('ab-cd-|', {
            a: expectedBatch('A1', 'A2'),
            b: expectedBatch('B1'),
            c: expectedBatch('B2', 'B3'),
            d: expectedBatch('A3'),
          });
        });
      });

      it('handles the `aborted$` option', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
          basePath,
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const providerResults = hot('--a---(b|)', {
            a: [result('1')],
            b: [result('2')],
          });
          registerResultProvider(createProvider('A', providerResults));

          const aborted$ = hot('----a--|', { a: undefined });

          const { find } = service.start({ core: coreStart, licenseChecker });
          const results = find('foo', { aborted$ }, request);

          expectObservable(results).toBe('--a-|', {
            a: expectedBatch('1'),
          });
        });
      });

      it('respects the timeout duration', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(100),
          basePath,
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const providerResults = hot('a 24ms b 100ms (c|)', {
            a: [result('1')],
            b: [result('2')],
            c: [result('3')],
          });
          registerResultProvider(createProvider('A', providerResults));

          const { find } = service.start({ core: coreStart, licenseChecker });
          const results = find('foo', {}, request);

          expectObservable(results).toBe('a 24ms b 74ms |', {
            a: expectedBatch('1'),
            b: expectedBatch('2'),
          });
        });
      });

      it('only returns a given maximum number of results per provider', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(100),
          basePath,
          maxProviderResults: 2,
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          registerResultProvider(
            createProvider(
              'A',
              hot('a---d-|', {
                a: [result('A1'), result('A2')],
                d: [result('A3')],
              })
            )
          );
          registerResultProvider(
            createProvider(
              'B',
              hot('-b-c|  ', {
                b: [result('B1')],
                c: [result('B2'), result('B3')],
              })
            )
          );

          const { find } = service.start({ core: coreStart, licenseChecker });
          const results = find('foo', {}, request);

          expectObservable(results).toBe('ab-(c|)', {
            a: expectedBatch('A1', 'A2'),
            b: expectedBatch('B1'),
            c: expectedBatch('B2'),
          });
        });
      });

      it('process the results before returning them', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
          basePath,
        });

        const resultA = result('A', {
          type: 'application',
          icon: 'appIcon',
          score: 42,
          title: 'foo',
          url: '/foo/bar',
        });
        const resultB = result('B', {
          type: 'dashboard',
          score: 69,
          title: 'bar',
          url: { path: '/foo', prependBasePath: false },
        });

        const provider = createProvider('A', of([resultA, resultB]));
        registerResultProvider(provider);

        const { find } = service.start({ core: coreStart, licenseChecker });
        const batch = await find('foo', {}, request).pipe(take(1)).toPromise();

        expect(batch.results).toHaveLength(2);
        expect(batch.results[0]).toEqual({
          ...resultA,
          url: '/base-path/foo/bar',
        });
        expect(batch.results[1]).toEqual({
          ...resultB,
          url: '/foo',
        });
      });

      it('emits an error when the license is invalid', async () => {
        licenseChecker.getState.mockReturnValue({ valid: false, message: 'expired' });

        const { registerResultProvider } = service.setup({
          config: createConfig(),
          basePath,
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const providerResults = hot('a-b-|', {
            a: [result('1')],
            b: [result('2')],
          });
          registerResultProvider(createProvider('A', providerResults));

          const { find } = service.start({ core: coreStart, licenseChecker });
          const results = find('foo', {}, request);

          expectObservable(results).toBe(
            '#',
            {},
            GlobalSearchFindError.invalidLicense(
              'GlobalSearch API is disabled because of invalid license state: expired'
            )
          );
        });
      });
    });
  });
});

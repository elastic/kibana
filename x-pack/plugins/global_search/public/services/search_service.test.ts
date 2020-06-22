/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchServerResultsMock, getDefaultPreferenceMock } from './search_service.test.mocks';

import { Observable, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { duration } from 'moment';
import { httpServiceMock } from '../../../../../src/core/public/mocks';
import { licenseCheckerMock } from '../../common/license_checker.mock';
import { GlobalSearchProviderResult, GlobalSearchResult } from '../../common/types';
import { GlobalSearchFindError } from '../../common/errors';
import { GlobalSearchClientConfigType } from '../config';
import { GlobalSearchResultProvider } from '../types';
import { SearchService } from './search_service';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

describe('SearchService', () => {
  let service: SearchService;
  let httpStart: ReturnType<typeof httpServiceMock.createStartContract>;
  let licenseChecker: ReturnType<typeof licenseCheckerMock.create>;

  const createConfig = (timeoutMs: number = 30000): GlobalSearchClientConfigType => {
    return {
      search_timeout: duration(timeoutMs).toString(),
    };
  };

  const startDeps = () => ({
    http: httpStart,
    licenseChecker,
  });

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

  const providerResult = (
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

  const serverResult = (
    id: string,
    parts: Partial<GlobalSearchResult> = {}
  ): GlobalSearchResult => ({
    title: id,
    type: 'test',
    url: '/foo/bar',
    score: 100,
    ...parts,
    id,
  });

  beforeEach(() => {
    service = new SearchService();
    httpStart = httpServiceMock.createStartContract({ basePath: '/base-path' });
    licenseChecker = licenseCheckerMock.create();

    fetchServerResultsMock.mockClear();
    fetchServerResultsMock.mockReturnValue(of());

    getDefaultPreferenceMock.mockClear();
    getDefaultPreferenceMock.mockReturnValue('default_pref');
  });

  describe('#setup()', () => {
    describe('#registerResultProvider()', () => {
      it('throws when trying to register the same provider twice', () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
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
        });

        const provider = createProvider('A');
        registerResultProvider(provider);

        const { find } = service.start(startDeps());
        find('foobar', { preference: 'pref' });

        expect(provider.find).toHaveBeenCalledTimes(1);
        expect(provider.find).toHaveBeenCalledWith(
          'foobar',
          expect.objectContaining({ preference: 'pref' })
        );
      });

      it('calls `fetchServerResults` with the correct parameters', () => {
        service.setup({ config: createConfig() });

        const { find } = service.start(startDeps());
        find('foobar', { preference: 'pref' });

        expect(fetchServerResultsMock).toHaveBeenCalledTimes(1);
        expect(fetchServerResultsMock).toHaveBeenCalledWith(
          httpStart,
          'foobar',
          expect.objectContaining({ preference: 'pref', aborted$: expect.any(Object) })
        );
      });

      it('calls `getDefaultPreference` when `preference` is not specified', () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
        });

        const provider = createProvider('A');
        registerResultProvider(provider);

        const { find } = service.start(startDeps());
        find('foobar', { preference: 'pref' });

        expect(getDefaultPreferenceMock).not.toHaveBeenCalled();

        expect(provider.find).toHaveBeenNthCalledWith(
          1,
          'foobar',
          expect.objectContaining({
            preference: 'pref',
          })
        );

        find('foobar', {});

        expect(getDefaultPreferenceMock).toHaveBeenCalledTimes(1);

        expect(provider.find).toHaveBeenNthCalledWith(
          2,
          'foobar',
          expect.objectContaining({
            preference: 'default_pref',
          })
        );
      });

      it('return the results from the provider', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const providerResults = hot('a-b-|', {
            a: [providerResult('1')],
            b: [providerResult('2')],
          });
          registerResultProvider(createProvider('A', providerResults));

          const { find } = service.start(startDeps());
          const results = find('foo', {});

          expectObservable(results).toBe('a-b-|', {
            a: expectedBatch('1'),
            b: expectedBatch('2'),
          });
        });
      });

      it('return the results from the server', async () => {
        service.setup({ config: createConfig() });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const serverResults = hot('a-b-|', {
            a: [serverResult('1')],
            b: [serverResult('2')],
          });

          fetchServerResultsMock.mockReturnValue(serverResults);

          const { find } = service.start(startDeps());
          const results = find('foo', {});

          expectObservable(results).toBe('a-b-|', {
            a: expectedBatch('1'),
            b: expectedBatch('2'),
          });
        });
      });

      it('handles multiple providers', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          registerResultProvider(
            createProvider(
              'A',
              hot('a---d-|', {
                a: [providerResult('A1'), providerResult('A2')],
                d: [providerResult('A3')],
              })
            )
          );
          registerResultProvider(
            createProvider(
              'B',
              hot('-b-c|  ', {
                b: [providerResult('B1')],
                c: [providerResult('B2'), providerResult('B3')],
              })
            )
          );

          const { find } = service.start(startDeps());
          const results = find('foo', {});

          expectObservable(results).toBe('ab-cd-|', {
            a: expectedBatch('A1', 'A2'),
            b: expectedBatch('B1'),
            c: expectedBatch('B2', 'B3'),
            d: expectedBatch('A3'),
          });
        });
      });

      it('return mixed server/client providers results', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          fetchServerResultsMock.mockReturnValue(
            hot('-----(c|)', {
              c: [serverResult('S1'), serverResult('S2')],
            })
          );

          registerResultProvider(
            createProvider(
              'A',
              hot('a-b-|', {
                a: [providerResult('P1')],
                b: [providerResult('P2')],
              })
            )
          );

          const { find } = service.start(startDeps());
          const results = find('foo', {});

          expectObservable(results).toBe('a-b--(c|)', {
            a: expectedBatch('P1'),
            b: expectedBatch('P2'),
            c: expectedBatch('S1', 'S2'),
          });
        });
      });

      it('handles the `aborted$` option', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(),
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const providerResults = hot('--a---(b|)', {
            a: [providerResult('1')],
            b: [providerResult('2')],
          });
          registerResultProvider(createProvider('A', providerResults));

          const aborted$ = hot('----a--|', { a: undefined });

          const { find } = service.start(startDeps());
          const results = find('foo', { aborted$ });

          expectObservable(results).toBe('--a-|', {
            a: expectedBatch('1'),
          });
        });
      });

      it('respects the timeout duration', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(100),
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const providerResults = hot('a 24ms b 100ms (c|)', {
            a: [providerResult('1')],
            b: [providerResult('2')],
            c: [providerResult('3')],
          });
          registerResultProvider(createProvider('A', providerResults));

          const { find } = service.start(startDeps());
          const results = find('foo', {});

          expectObservable(results).toBe('a 24ms b 74ms |', {
            a: expectedBatch('1'),
            b: expectedBatch('2'),
          });
        });
      });

      it('only returns a given maximum number of results per provider', async () => {
        const { registerResultProvider } = service.setup({
          config: createConfig(100),
          maxProviderResults: 2,
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          registerResultProvider(
            createProvider(
              'A',
              hot('a---d-|', {
                a: [providerResult('A1'), providerResult('A2')],
                d: [providerResult('A3')],
              })
            )
          );
          registerResultProvider(
            createProvider(
              'B',
              hot('-b-c|  ', {
                b: [providerResult('B1')],
                c: [providerResult('B2'), providerResult('B3')],
              })
            )
          );

          const { find } = service.start(startDeps());
          const results = find('foo', {});

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
        });

        const resultA = providerResult('A', {
          type: 'application',
          icon: 'appIcon',
          score: 42,
          title: 'foo',
          url: '/foo/bar',
        });
        const resultB = providerResult('B', {
          type: 'dashboard',
          score: 69,
          title: 'bar',
          url: { path: '/foo', prependBasePath: false },
        });

        const provider = createProvider('A', of([resultA, resultB]));
        registerResultProvider(provider);

        const { find } = service.start(startDeps());
        const batch = await find('foo', {}).pipe(take(1)).toPromise();

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
        });

        getTestScheduler().run(({ expectObservable, hot }) => {
          const providerResults = hot('a-b-|', {
            a: [providerResult('1')],
            b: [providerResult('2')],
          });
          registerResultProvider(createProvider('A', providerResults));

          const { find } = service.start(startDeps());
          const results = find('foo', {});

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

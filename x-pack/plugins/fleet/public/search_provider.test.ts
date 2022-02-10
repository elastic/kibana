/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestScheduler } from 'rxjs/testing';
import { NEVER } from 'rxjs';

import { coreMock } from 'src/core/public/mocks';

import { createPackageSearchProvider, toSearchResult } from './search_provider';
import type { GetPackagesResponse } from './types';

jest.mock('./hooks/use_request/epm', () => {
  return {
    ...jest.requireActual('./hooks/use_request/epm'),
    sendGetPackages: jest.fn(),
  };
});

import { sendGetPackages } from './hooks';

const mockSendGetPackages = sendGetPackages as jest.Mock;

const testResponse: GetPackagesResponse['items'] = [
  {
    description: 'test',
    download: 'test',
    id: 'test',
    name: 'test',
    path: 'test',
    release: 'experimental',
    savedObject: {} as any,
    status: 'installed',
    title: 'test',
    version: 'test',
  },
  {
    description: 'test1',
    download: 'test1',
    id: 'test1',
    name: 'test1',
    path: 'test1',
    release: 'ga',
    status: 'not_installed',
    title: 'test1',
    version: 'test1',
  },
];

const getTestScheduler = () => {
  return new TestScheduler((actual, expected) => {
    return expect(actual).toEqual(expected);
  });
};

describe('Package search provider', () => {
  let setupMock: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    setupMock = coreMock.createSetup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#find', () => {
    test('returns formatted results', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        mockSendGetPackages.mockReturnValue(
          hot('--(a|)', { a: { data: { response: testResponse } } })
        );
        setupMock.getStartServices.mockReturnValue(
          hot('--(a|)', { a: [coreMock.createStart()] }) as any
        );

        const packageSearchProvider = createPackageSearchProvider(setupMock);

        expectObservable(
          packageSearchProvider.find(
            { term: 'test' },
            { aborted$: NEVER, maxResults: 100, preference: '' }
          )
        ).toBe('--(a|)', {
          a: [
            {
              id: 'test',
              score: 80,
              title: 'test',
              type: 'integration',
              url: {
                path: 'undefined/detail/test/overview',
                prependBasePath: false,
              },
            },
            {
              id: 'test1',
              score: 80,
              title: 'test1',
              type: 'integration',
              url: {
                path: 'undefined/detail/test1/overview',
                prependBasePath: false,
              },
            },
          ],
        });
      });

      expect(sendGetPackages).toHaveBeenCalledTimes(1);
    });

    test('calls EPR once only', () => {
      getTestScheduler().run(({ hot }) => {
        mockSendGetPackages.mockReturnValue(hot('--(a|)', { a: { data: { response: [] } } }));
        setupMock.getStartServices.mockReturnValue(
          hot('--(a|)', { a: [coreMock.createStart()] }) as any
        );
        const packageSearchProvider = createPackageSearchProvider(setupMock);
        packageSearchProvider.find(
          { term: 'test' },
          { aborted$: NEVER, maxResults: 100, preference: '' }
        );
        packageSearchProvider.find(
          { term: 'test' },
          { aborted$: NEVER, maxResults: 100, preference: '' }
        );
      });

      expect(sendGetPackages).toHaveBeenCalledTimes(1);
    });

    test('completes without returning results if aborted', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        mockSendGetPackages.mockReturnValue(hot('--(a|)', { a: { data: { response: [] } } }));
        setupMock.getStartServices.mockReturnValue(
          hot('--(a|)', { a: [coreMock.createStart()] }) as any
        );
        const aborted$ = hot('-a', { a: undefined });
        const packageSearchProvider = createPackageSearchProvider(setupMock);

        expectObservable(
          packageSearchProvider.find(
            { term: 'test' },
            { aborted$, maxResults: 100, preference: '' }
          )
        ).toBe('-|');
      });

      expect(sendGetPackages).toHaveBeenCalledTimes(1);
    });

    test('respect maximum results', () => {
      getTestScheduler().run(({ hot, expectObservable }) => {
        mockSendGetPackages.mockReturnValue(
          hot('--(a|)', { a: { data: { response: testResponse } } })
        );
        setupMock.getStartServices.mockReturnValue(
          hot('--(a|)', { a: [coreMock.createStart()] }) as any
        );
        const packageSearchProvider = createPackageSearchProvider(setupMock);
        expectObservable(
          packageSearchProvider.find(
            { term: 'test1' },
            { aborted$: NEVER, maxResults: 1, preference: '' }
          )
        ).toBe('--(a|)', {
          a: [
            {
              id: 'test1',
              score: 80,
              title: 'test1',
              type: 'integration',
              url: {
                path: 'undefined/detail/test1/overview',
                prependBasePath: false,
              },
            },
          ],
        });
      });

      expect(sendGetPackages).toHaveBeenCalledTimes(1);
    });

    describe('tags', () => {
      test('without packages tag, without search term', () => {
        getTestScheduler().run(({ hot, expectObservable }) => {
          mockSendGetPackages.mockReturnValue(
            hot('--(a|)', { a: { data: { response: testResponse } } })
          );
          setupMock.getStartServices.mockReturnValue(
            hot('--(a|)', { a: [coreMock.createStart()] }) as any
          );
          const packageSearchProvider = createPackageSearchProvider(setupMock);
          expectObservable(
            packageSearchProvider.find(
              { types: ['test'] },
              { aborted$: NEVER, maxResults: 100, preference: '' }
            )
          ).toBe('(a|)', {
            a: [],
          });
        });

        expect(sendGetPackages).toHaveBeenCalledTimes(0);
      });

      test('with integration tag, with no search term', () => {
        getTestScheduler().run(({ hot, expectObservable }) => {
          mockSendGetPackages.mockReturnValue(
            hot('--(a|)', { a: { data: { response: testResponse } } })
          );
          setupMock.getStartServices.mockReturnValue(
            hot('--(a|)', { a: [coreMock.createStart()] }) as any
          );
          const packageSearchProvider = createPackageSearchProvider(setupMock);
          expectObservable(
            packageSearchProvider.find(
              { types: ['integration'] },
              { aborted$: NEVER, maxResults: 100, preference: '' }
            )
          ).toBe('--(a|)', {
            a: [
              {
                id: 'test',
                score: 80,
                title: 'test',
                type: 'integration',
                url: {
                  path: 'undefined/detail/test/overview',
                  prependBasePath: false,
                },
              },
              {
                id: 'test1',
                score: 80,
                title: 'test1',
                type: 'integration',
                url: {
                  path: 'undefined/detail/test1/overview',
                  prependBasePath: false,
                },
              },
            ],
          });
        });

        expect(sendGetPackages).toHaveBeenCalledTimes(1);
      });

      test('with integration tag, with search term', () => {
        getTestScheduler().run(({ hot, expectObservable }) => {
          mockSendGetPackages.mockReturnValue(
            hot('--(a|)', { a: { data: { response: testResponse } } })
          );
          setupMock.getStartServices.mockReturnValue(
            hot('--(a|)', { a: [coreMock.createStart()] }) as any
          );
          const packageSearchProvider = createPackageSearchProvider(setupMock);
          expectObservable(
            packageSearchProvider.find(
              { term: 'test1', types: ['integration'] },
              { aborted$: NEVER, maxResults: 100, preference: '' }
            )
          ).toBe('--(a|)', {
            a: [
              {
                id: 'test1',
                score: 80,
                title: 'test1',
                type: 'integration',
                url: {
                  path: 'undefined/detail/test1/overview',
                  prependBasePath: false,
                },
              },
            ],
          });
        });

        expect(sendGetPackages).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('toSearchResult', () => {
    let startMock: ReturnType<typeof coreMock.createStart>;

    beforeEach(() => {
      startMock = coreMock.createStart();
    });

    it('uses svg icon if available', () => {
      const pkg = {
        ...testResponse[0],
        icons: [{ type: 'image/svg+xml', src: '/img_nginx.svg', path: '' }],
      };
      const { icon } = toSearchResult(pkg, startMock.application, startMock.http.basePath);
      expect(icon).toMatchInlineSnapshot(`"/api/fleet/epm/packages/test/test/img_nginx.svg"`);
    });

    it('prepends base path to svg URL', () => {
      startMock = coreMock.createStart({ basePath: '/foo' });
      const pkg = {
        ...testResponse[0],
        icons: [{ type: 'image/svg+xml', src: '/img_nginx.svg', path: '' }],
      };
      const { icon } = toSearchResult(pkg, startMock.application, startMock.http.basePath);
      expect(icon).toMatchInlineSnapshot(`"/foo/api/fleet/epm/packages/test/test/img_nginx.svg"`);
    });

    // ICON_TYPES is empty in EUI: https://github.com/elastic/eui/issues/5138
    it.skip('uses eui icon type as fallback', () => {
      const pkg = {
        ...testResponse[0],
        name: 'elasticsearch',
        icons: [{ type: 'image/jpg', src: '/img_nginx.svg', path: '' }],
      };
      const { icon } = toSearchResult(pkg, startMock.application, startMock.http.basePath);
      expect(icon).toMatchInlineSnapshot(`"logoElasticsearch"`);
    });
  });
});

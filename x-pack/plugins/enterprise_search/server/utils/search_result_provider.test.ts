/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../common/constants';

import { getSearchResultProvider } from './search_result_provider';

const getTestScheduler = () => {
  return new TestScheduler((actual, expected) => {
    return expect(actual).toEqual(expected);
  });
};

describe('Enterprise Search search provider', () => {
  const basePathMock = {
    prepend: (input: string) => `/kbn${input}`,
  } as any;

  const crawlerResult = {
    icon: '/kbn/plugins/enterpriseSearch/assets/source_icons/crawler.svg',
    id: 'elastic-crawler',
    score: 75,
    title: 'Elastic Web Crawler',
    type: 'Enterprise Search',
    url: {
      path: `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/search_indices/new_index/crawler`,
      prependBasePath: true,
    },
  };

  const mongoResult = {
    icon: '/kbn/plugins/enterpriseSearch/assets/source_icons/mongodb.svg',
    id: 'mongodb',
    score: 75,
    title: 'MongoDB',
    type: 'Enterprise Search',
    url: {
      path: `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/search_indices/new_index/connector?service_type=mongodb`,
      prependBasePath: true,
    },
  };

  const searchResultProvider = getSearchResultProvider(basePathMock, {
    hasConnectors: true,
    hasWebCrawler: true,
  } as any);

  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('find', () => {
    it('returns formatted results', () => {
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchResultProvider.find(
            { term: 'crawler' },
            { aborted$: NEVER, maxResults: 100, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: [crawlerResult],
        });
      });
    });

    it('returns everything on empty string', () => {
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchResultProvider.find(
            { term: '' },
            { aborted$: NEVER, maxResults: 100, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: expect.arrayContaining([
            { ...crawlerResult, score: 80 },
            { ...mongoResult, score: 80 },
          ]),
        });
      });
    });

    it('respect maximum results', () => {
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchResultProvider.find(
            { term: '' },
            { aborted$: NEVER, maxResults: 1, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: [{ ...crawlerResult, score: 80 }],
        });
      });
    });

    it('omits crawler if config has crawler disabled', () => {
      const searchProvider = getSearchResultProvider(basePathMock, {
        hasConnectors: true,
        hasWebCrawler: false,
      } as any);
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchProvider.find(
            { term: '' },
            { aborted$: NEVER, maxResults: 100, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: expect.not.arrayContaining([{ ...crawlerResult, score: 80 }]),
        });
      });
    });

    it('omits connectors if config has connectors disabled', () => {
      const searchProvider = getSearchResultProvider(basePathMock, {
        hasConnectors: false,
        hasWebCrawler: true,
      } as any);
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchProvider.find(
            { term: '' },
            { aborted$: NEVER, maxResults: 100, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: expect.not.arrayContaining([{ mongoResult, score: 80 }]),
        });
      });
    });

    it('returns nothing if tag is specified', () => {
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchResultProvider.find(
            { tags: ['tag'], term: '' },
            { aborted$: NEVER, maxResults: 1, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: [],
        });
      });
    });
    it('returns nothing if unknown type is specified', () => {
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchResultProvider.find(
            { term: '', types: ['tag'] },
            { aborted$: NEVER, maxResults: 1, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: [],
        });
      });
    });
    it('returns results for integrations tag', () => {
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchResultProvider.find(
            { term: 'crawler', types: ['integration'] },
            { aborted$: NEVER, maxResults: 1, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: [crawlerResult],
        });
      });
    });
    it('returns results for enterprise search tag', () => {
      getTestScheduler().run(({ expectObservable }) => {
        expectObservable(
          searchResultProvider.find(
            { term: 'crawler', types: ['enterprise search'] },
            { aborted$: NEVER, maxResults: 1, preference: '' },
            {} as any
          )
        ).toBe('(a|)', {
          a: [crawlerResult],
        });
      });
    });
  });
});

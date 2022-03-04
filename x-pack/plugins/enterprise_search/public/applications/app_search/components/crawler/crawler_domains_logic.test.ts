/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { Meta } from '../../../../../common/types';

import { DEFAULT_META } from '../../../shared/constants';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers/error_handling';

import { CrawlerDomainsLogic, CrawlerDomainsValues } from './crawler_domains_logic';
import { CrawlerDataFromServer, CrawlerDomain, CrawlerDomainFromServer } from './types';
import { crawlerDataServerToClient } from './utils';

const DEFAULT_VALUES: CrawlerDomainsValues = {
  dataLoading: true,
  domains: [],
  meta: DEFAULT_META,
};

const crawlerDataResponse: CrawlerDataFromServer = {
  domains: [
    {
      id: '507f1f77bcf86cd799439011',
      name: 'elastic.co',
      created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
      document_count: 13,
      sitemaps: [],
      entry_points: [],
      crawl_rules: [],
      deduplication_enabled: false,
      deduplication_fields: ['title'],
      available_deduplication_fields: ['title', 'description'],
    },
  ],
  events: [],
  most_recent_crawl_request: null,
};

const clientCrawlerData = crawlerDataServerToClient(crawlerDataResponse);

const domainsFromServer: CrawlerDomainFromServer[] = [
  {
    name: 'http://www.example.com',
    created_on: 'foo',
    document_count: 10,
    id: '1',
    crawl_rules: [],
    entry_points: [],
    sitemaps: [],
    deduplication_enabled: true,
    deduplication_fields: [],
    available_deduplication_fields: [],
  },
];

const domains: CrawlerDomain[] = [
  {
    createdOn: 'foo',
    documentCount: 10,
    id: '1',
    url: 'http://www.example.com',
    crawlRules: [],
    entryPoints: [],
    sitemaps: [],
    deduplicationEnabled: true,
    deduplicationFields: [],
    availableDeduplicationFields: [],
  },
];

const meta: Meta = {
  page: {
    current: 2,
    size: 100,
    total_pages: 5,
    total_results: 500,
  },
};

describe('CrawlerDomainsLogic', () => {
  const { mount } = new LogicMounter(CrawlerDomainsLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(CrawlerDomainsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onReceiveData', () => {
      it('sets state from an API call', () => {
        mount();

        CrawlerDomainsLogic.actions.onReceiveData(domains, meta);

        expect(CrawlerDomainsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          domains,
          meta,
          dataLoading: false,
        });
      });
    });

    describe('onPaginate', () => {
      it('sets dataLoading to true & sets meta state', () => {
        mount({ dataLoading: false });
        CrawlerDomainsLogic.actions.onPaginate(5);

        expect(CrawlerDomainsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
          meta: {
            ...DEFAULT_META,
            page: {
              ...DEFAULT_META.page,
              current: 5,
            },
          },
        });
      });
    });
  });

  describe('listeners', () => {
    describe('fetchCrawlerDomainsData', () => {
      it('updates logic with data that has been converted from server to client', async () => {
        mount();
        jest.spyOn(CrawlerDomainsLogic.actions, 'onReceiveData');

        http.get.mockReturnValueOnce(
          Promise.resolve({
            results: domainsFromServer,
            meta,
          })
        );

        CrawlerDomainsLogic.actions.fetchCrawlerDomainsData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/domains',
          {
            query: { 'page[current]': 1, 'page[size]': 10 },
          }
        );
        expect(CrawlerDomainsLogic.actions.onReceiveData).toHaveBeenCalledWith(domains, meta);
      });

      it('displays any errors to the user', async () => {
        mount();
        http.get.mockReturnValueOnce(Promise.reject('error'));

        CrawlerDomainsLogic.actions.fetchCrawlerDomainsData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('deleteDomain', () => {
      it('deletes the domain and then calls crawlerDomainDeleted with the response', async () => {
        jest.spyOn(CrawlerDomainsLogic.actions, 'crawlerDomainDeleted');
        http.delete.mockReturnValue(Promise.resolve(crawlerDataResponse));

        CrawlerDomainsLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
        await nextTick();

        expect(http.delete).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/domains/1234',
          {
            query: { respond_with: 'crawler_details' },
          }
        );
        expect(CrawlerDomainsLogic.actions.crawlerDomainDeleted).toHaveBeenCalledWith(
          clientCrawlerData
        );
      });

      itShowsServerErrorAsFlashMessage(http.delete, () => {
        CrawlerDomainsLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
      });
    });
  });
});

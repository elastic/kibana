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
  mockKibanaValues,
} from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

jest.mock('./crawler_logic', () => ({
  CrawlerLogic: {
    actions: {
      fetchCrawlerData: jest.fn(),
    },
  },
}));

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { CrawlerLogic } from './crawler_logic';
import { CrawlerSingleDomainLogic, CrawlerSingleDomainValues } from './crawler_single_domain_logic';
import { CrawlerDomain, CrawlerPolicies, CrawlerRules } from './types';

const DEFAULT_VALUES: CrawlerSingleDomainValues = {
  dataLoading: true,
  domain: null,
};

describe('CrawlerSingleDomainLogic', () => {
  const { mount } = new LogicMounter(CrawlerSingleDomainLogic);
  const { http } = mockHttpValues;
  const { flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlerSingleDomainLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onReceiveDomainData', () => {
      const domain = {
        id: '507f1f77bcf86cd799439011',
      };

      beforeEach(() => {
        CrawlerSingleDomainLogic.actions.onReceiveDomainData(domain as CrawlerDomain);
      });

      it('should set the domain', () => {
        expect(CrawlerSingleDomainLogic.values.domain).toEqual(domain);
      });
    });

    describe('updateEntryPoints', () => {
      beforeEach(() => {
        mount({
          domain: {
            id: '507f1f77bcf86cd799439011',
            entryPoints: [],
          },
        });

        CrawlerSingleDomainLogic.actions.updateEntryPoints([
          {
            id: '1234',
            value: '/',
          },
        ]);
      });

      it('should update the entry points on the domain', () => {
        expect(CrawlerSingleDomainLogic.values.domain).toEqual({
          id: '507f1f77bcf86cd799439011',
          entryPoints: [
            {
              id: '1234',
              value: '/',
            },
          ],
        });
      });
    });

    describe('updateSitemaps', () => {
      beforeEach(() => {
        mount({
          domain: {
            id: '507f1f77bcf86cd799439011',
            sitemaps: [],
          },
        });

        CrawlerSingleDomainLogic.actions.updateSitemaps([
          {
            id: '1234',
            url: 'http://www.example.com/sitemap.xml',
          },
        ]);
      });

      it('should update the sitemaps on the domain', () => {
        expect(CrawlerSingleDomainLogic.values.domain).toEqual({
          id: '507f1f77bcf86cd799439011',
          sitemaps: [
            {
              id: '1234',
              url: 'http://www.example.com/sitemap.xml',
            },
          ],
        });
      });
    });

    describe('updateCrawlRules', () => {
      beforeEach(() => {
        mount({
          domain: {
            id: '507f1f77bcf86cd799439011',
            crawlRules: [],
          },
        });

        CrawlerSingleDomainLogic.actions.updateCrawlRules([
          {
            id: '1234',
            policy: CrawlerPolicies.allow,
            rule: CrawlerRules.beginsWith,
            pattern: 'foo',
          },
        ]);
      });

      it('should update the crawl rules on the domain', () => {
        expect(CrawlerSingleDomainLogic.values.domain).toEqual({
          id: '507f1f77bcf86cd799439011',
          crawlRules: [
            {
              id: '1234',
              policy: CrawlerPolicies.allow,
              rule: CrawlerRules.beginsWith,
              pattern: 'foo',
            },
          ],
        });
      });
    });
  });

  describe('listeners', () => {
    describe('deleteDomain', () => {
      it('flashes a success toast and redirects the user to the crawler overview on success', async () => {
        jest.spyOn(CrawlerLogic.actions, 'fetchCrawlerData');
        const { navigateToUrl } = mockKibanaValues;

        http.delete.mockReturnValue(Promise.resolve());

        CrawlerSingleDomainLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
        await nextTick();

        expect(http.delete).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/domains/1234'
        );

        expect(CrawlerLogic.actions.fetchCrawlerData).toHaveBeenCalled();
        expect(flashSuccessToast).toHaveBeenCalled();
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/crawler');
      });

      itShowsServerErrorAsFlashMessage(http.delete, () => {
        CrawlerSingleDomainLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
      });
    });

    describe('fetchDomainData', () => {
      it('updates logic with data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerSingleDomainLogic.actions, 'onReceiveDomainData');
        http.get.mockReturnValueOnce(
          Promise.resolve({
            id: '507f1f77bcf86cd799439011',
            name: 'https://elastic.co',
            created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
            document_count: 13,
            sitemaps: [],
            entry_points: [],
            crawl_rules: [],
          })
        );

        CrawlerSingleDomainLogic.actions.fetchDomainData('507f1f77bcf86cd799439011');
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/domains/507f1f77bcf86cd799439011'
        );
        expect(CrawlerSingleDomainLogic.actions.onReceiveDomainData).toHaveBeenCalledWith({
          id: '507f1f77bcf86cd799439011',
          createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
          url: 'https://elastic.co',
          documentCount: 13,
          sitemaps: [],
          entryPoints: [],
          crawlRules: [],
        });
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        CrawlerSingleDomainLogic.actions.fetchDomainData('507f1f77bcf86cd799439011');
      });
    });

    describe('submitDeduplicationUpdate', () => {
      it('updates logic with data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerSingleDomainLogic.actions, 'onReceiveDomainData');
        http.put.mockReturnValueOnce(
          Promise.resolve({
            id: '507f1f77bcf86cd799439011',
            name: 'https://elastic.co',
            created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
            document_count: 13,
            sitemaps: [],
            entry_points: [],
            crawl_rules: [],
            deduplication_enabled: true,
            deduplication_fields: ['title'],
            available_deduplication_fields: ['title', 'description'],
          })
        );

        CrawlerSingleDomainLogic.actions.submitDeduplicationUpdate(
          { id: '507f1f77bcf86cd799439011' } as CrawlerDomain,
          { fields: ['title'], enabled: true }
        );
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/domains/507f1f77bcf86cd799439011',
          {
            body: JSON.stringify({ deduplication_enabled: true, deduplication_fields: ['title'] }),
          }
        );
        expect(CrawlerSingleDomainLogic.actions.onReceiveDomainData).toHaveBeenCalledWith({
          id: '507f1f77bcf86cd799439011',
          createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
          url: 'https://elastic.co',
          documentCount: 13,
          sitemaps: [],
          entryPoints: [],
          crawlRules: [],
          deduplicationEnabled: true,
          deduplicationFields: ['title'],
          availableDeduplicationFields: ['title', 'description'],
        });
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        CrawlerSingleDomainLogic.actions.submitDeduplicationUpdate(
          { id: '507f1f77bcf86cd799439011' } as CrawlerDomain,
          { fields: ['title'], enabled: true }
        );
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter, mockHttpValues } from '../../../../../__mocks__/kea_logic';
import '../../_mocks_/index_name_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';
import { DomainConfig } from '../../../../api/crawler/types';

import { CrawlCustomSettingsFlyoutDomainConfigLogic } from './crawl_custom_settings_flyout_domain_logic';

describe('CrawlCustomSettingsFlyoutDomainConfigLogic', () => {
  const { mount } = new LogicMounter(CrawlCustomSettingsFlyoutDomainConfigLogic);

  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlCustomSettingsFlyoutDomainConfigLogic.values).toEqual({
      domainConfigMap: {},
      domainConfigs: [],
      domainUrls: [],
    });
  });

  describe('actions', () => {
    describe('fetchDomainConfigData', () => {
      it('updates logic with data that has been converted from server to client', async () => {
        jest.spyOn(CrawlCustomSettingsFlyoutDomainConfigLogic.actions, 'onRecieveDomainConfigData');

        http.get.mockReturnValueOnce(
          Promise.resolve({
            meta: {
              page: {
                current: 1,
                size: 1,
                total_pages: 2,
              },
            },
            results: [
              {
                id: '1234',
                name: 'https://www.elastic.co',
                seed_urls: [],
                sitemap_urls: [],
              },
            ],
          })
        );

        http.get.mockReturnValueOnce(
          Promise.resolve({
            meta: {
              page: {
                current: 2,
                size: 1,
                total_pages: 2,
              },
            },
            results: [
              {
                id: '5678',
                name: 'https://www.swiftype.com',
                seed_urls: [],
                sitemap_urls: [],
              },
            ],
          })
        );

        CrawlCustomSettingsFlyoutDomainConfigLogic.actions.fetchDomainConfigData();
        await nextTick();

        expect(http.get).toHaveBeenNthCalledWith(
          1,
          '/internal/enterprise_search/indices/index-name/crawler/domain_configs',
          {
            query: {
              'page[current]': 1,
              'page[size]': 100,
            },
          }
        );
        expect(http.get).toHaveBeenNthCalledWith(
          2,
          '/internal/enterprise_search/indices/index-name/crawler/domain_configs',
          {
            query: {
              'page[current]': 2,
              'page[size]': 1,
            },
          }
        );
        expect(
          CrawlCustomSettingsFlyoutDomainConfigLogic.actions.onRecieveDomainConfigData
        ).toHaveBeenCalledWith([
          {
            id: '1234',
            name: 'https://www.elastic.co',
            seedUrls: [],
            sitemapUrls: [],
          },
          {
            id: '5678',
            name: 'https://www.swiftype.com',
            seedUrls: [],
            sitemapUrls: [],
          },
        ]);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        CrawlCustomSettingsFlyoutDomainConfigLogic.actions.fetchDomainConfigData();
      });
    });

    describe('onRecieveDomainConfigData', () => {
      it('saves the data', () => {
        mount({
          domainConfigs: [],
        });

        CrawlCustomSettingsFlyoutDomainConfigLogic.actions.onRecieveDomainConfigData([
          {
            name: 'https://www.elastic.co',
          },
        ] as DomainConfig[]);

        expect(CrawlCustomSettingsFlyoutDomainConfigLogic.values.domainConfigs).toEqual([
          {
            name: 'https://www.elastic.co',
          },
        ]);
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      mount({
        domainConfigs: [
          {
            name: 'https://www.elastic.co',
            sitemapUrls: [
              'https://www.elastic.co/sitemap1.xml',
              'https://www.elastic.co/sitemap2.xml',
            ],
            seedUrls: ['https://www.elastic.co/', 'https://www.elastic.co/guide'],
          },
          {
            name: 'https://swiftype.com',
            sitemapUrls: ['https://swiftype.com/sitemap1.xml', 'https://swiftype.com/sitemap2.xml'],
            seedUrls: ['https://swiftype.com/', 'https://swiftype.com/documentation'],
          },
        ],
      });
    });

    describe('domainUrls', () => {
      it('contains all the domain urls from the domain config', () => {
        expect(CrawlCustomSettingsFlyoutDomainConfigLogic.values.domainUrls).toEqual([
          'https://www.elastic.co',
          'https://swiftype.com',
        ]);
      });
    });

    describe('domainConfigMap', () => {
      it('contains all the domain urls from the domain config', () => {
        expect(CrawlCustomSettingsFlyoutDomainConfigLogic.values.domainConfigMap).toEqual({
          'https://www.elastic.co': {
            name: 'https://www.elastic.co',
            sitemapUrls: [
              'https://www.elastic.co/sitemap1.xml',
              'https://www.elastic.co/sitemap2.xml',
            ],
            seedUrls: ['https://www.elastic.co/', 'https://www.elastic.co/guide'],
          },
          'https://swiftype.com': {
            name: 'https://swiftype.com',
            sitemapUrls: ['https://swiftype.com/sitemap1.xml', 'https://swiftype.com/sitemap2.xml'],
            seedUrls: ['https://swiftype.com/', 'https://swiftype.com/documentation'],
          },
        });
      });
    });
  });
});

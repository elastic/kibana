/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter, mockHttpValues } from '../../../../../__mocks__/kea_logic';
import '../../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';
import { CrawlerLogic } from '../../crawler_logic';
import { DomainConfig } from '../../types';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

describe('CrawlCustomSettingsFlyoutLogic', () => {
  const { mount } = new LogicMounter(CrawlCustomSettingsFlyoutLogic);
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlCustomSettingsFlyoutLogic.values).toEqual({
      customEntryPointUrls: [],
      customSitemapUrls: [],
      domainConfigMap: {},
      domainConfigs: [],
      domainUrls: [],
      entryPointUrls: [],
      includeSitemapsInRobotsTxt: true,
      isDataLoading: true,
      isFlyoutVisible: false,
      isFormSubmitting: false,
      maxCrawlDepth: 2,
      selectedDomainUrls: [],
      selectedEntryPointUrls: [],
      selectedSitemapUrls: [],
      sitemapUrls: [],
    });
  });

  describe('actions', () => {
    describe('fetchDomainConfigData', () => {
      it('updates logic with data that has been converted from server to client', async () => {
        jest.spyOn(CrawlCustomSettingsFlyoutLogic.actions, 'onRecieveDomainConfigData');
        http.get.mockReturnValueOnce(
          Promise.resolve({
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

        CrawlCustomSettingsFlyoutLogic.actions.fetchDomainConfigData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/domain_configs'
        );
        expect(
          CrawlCustomSettingsFlyoutLogic.actions.onRecieveDomainConfigData
        ).toHaveBeenCalledWith([
          {
            id: '1234',
            name: 'https://www.elastic.co',
            seedUrls: [],
            sitemapUrls: [],
          },
        ]);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        CrawlCustomSettingsFlyoutLogic.actions.fetchDomainConfigData();
      });
    });

    describe('hideFlyout', () => {
      it('hides the modal', () => {
        CrawlCustomSettingsFlyoutLogic.actions.hideFlyout();

        expect(CrawlCustomSettingsFlyoutLogic.values.isFlyoutVisible).toBe(false);
      });
    });

    describe('onRecieveDomainConfigData', () => {
      it('saves the data', () => {
        mount({
          domainConfigs: [],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onRecieveDomainConfigData([
          {
            name: 'https://www.elastic.co',
          },
        ] as DomainConfig[]);

        expect(CrawlCustomSettingsFlyoutLogic.values.domainConfigs).toEqual([
          {
            name: 'https://www.elastic.co',
          },
        ]);
      });
    });

    describe('onSelectCustomSitemapUrls', () => {
      it('saves the urls', () => {
        mount({
          customSitemapUrls: [],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectCustomSitemapUrls([
          'https://www.elastic.co/custom-sitemap1.xml',
          'https://swiftype.com/custom-sitemap2.xml',
        ]);

        expect(CrawlCustomSettingsFlyoutLogic.values.customSitemapUrls).toEqual([
          'https://www.elastic.co/custom-sitemap1.xml',
          'https://swiftype.com/custom-sitemap2.xml',
        ]);
      });
    });

    describe('onSelectCustomEntryPointUrls', () => {
      it('saves the urls', () => {
        mount({
          customEntryPointUrls: [],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectCustomEntryPointUrls([
          'https://www.elastic.co/custom-entry-point',
          'https://swiftype.com/custom-entry-point',
        ]);

        expect(CrawlCustomSettingsFlyoutLogic.values.customEntryPointUrls).toEqual([
          'https://www.elastic.co/custom-entry-point',
          'https://swiftype.com/custom-entry-point',
        ]);
      });
    });

    describe('onSelectDomainUrls', () => {
      it('saves the urls', () => {
        mount({
          selectedDomainUrls: [],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectDomainUrls([
          'https://www.elastic.co',
          'https://swiftype.com',
        ]);

        expect(CrawlCustomSettingsFlyoutLogic.values.selectedDomainUrls).toEqual([
          'https://www.elastic.co',
          'https://swiftype.com',
        ]);
      });

      it('filters selected sitemap urls by selected domains', () => {
        mount({
          selectedDomainUrls: ['https://www.elastic.co', 'https://swiftype.com'],
          selectedSitemapUrls: [
            'https://www.elastic.co/sitemap1.xml',
            'https://swiftype.com/sitemap2.xml',
          ],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectDomainUrls(['https://swiftype.com']);

        expect(CrawlCustomSettingsFlyoutLogic.values.selectedSitemapUrls).toEqual([
          'https://swiftype.com/sitemap2.xml',
        ]);
      });

      it('filters selected entry point urls by selected domains', () => {
        mount({
          selectedDomainUrls: ['https://www.elastic.co', 'https://swiftype.com'],
          selectedEntryPointUrls: [
            'https://www.elastic.co/guide',
            'https://swiftype.com/documentation',
          ],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectDomainUrls(['https://swiftype.com']);

        expect(CrawlCustomSettingsFlyoutLogic.values.selectedEntryPointUrls).toEqual([
          'https://swiftype.com/documentation',
        ]);
      });
    });

    describe('onSelectEntryPointUrls', () => {
      it('saves the urls', () => {
        mount({
          selectedEntryPointUrls: [],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectEntryPointUrls([
          'https://www.elastic.co/guide',
          'https://swiftype.com/documentation',
        ]);

        expect(CrawlCustomSettingsFlyoutLogic.values.selectedEntryPointUrls).toEqual([
          'https://www.elastic.co/guide',
          'https://swiftype.com/documentation',
        ]);
      });
    });

    describe('onSelectMaxCrawlDepth', () => {
      it('saves the crawl depth', () => {
        mount({
          maxCrawlDepth: 5,
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectMaxCrawlDepth(10);

        expect(CrawlCustomSettingsFlyoutLogic.values.maxCrawlDepth).toEqual(10);
      });
    });

    describe('onSelectSitemapUrls', () => {
      it('saves the urls', () => {
        mount({
          selectedSitemapUrls: [],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectSitemapUrls([
          'https://www.elastic.co/sitemap1.xml',
          'https://swiftype.com/sitemap2.xml',
        ]);

        expect(CrawlCustomSettingsFlyoutLogic.values.selectedSitemapUrls).toEqual([
          'https://www.elastic.co/sitemap1.xml',
          'https://swiftype.com/sitemap2.xml',
        ]);
      });
    });

    describe('showFlyout', () => {
      it('shows the modal and resets the form', () => {
        mount({
          customEntryPointUrls: [
            'https://www.elastic.co/custom-entry-point',
            'https://swiftype.com/custom-entry-point',
          ],
          customSitemapUrls: [
            'https://www.elastic.co/custom-sitemap1.xml',
            'https://swiftype.com/custom-sitemap2.xml',
          ],
          includeSitemapsInRobotsTxt: false,
          isDataLoading: false,
          isFlyoutVisible: false,
          selectedDomainUrls: ['https://www.elastic.co', 'https://swiftype.com'],
          selectedEntryPointUrls: [
            'https://www.elastic.co/guide',
            'https://swiftype.com/documentation',
          ],
          selectedSitemapUrls: [
            'https://www.elastic.co/sitemap1.xml',
            'https://swiftype.com/sitemap2.xml',
          ],
        });

        CrawlCustomSettingsFlyoutLogic.actions.showFlyout();

        expect(CrawlCustomSettingsFlyoutLogic.values).toEqual(
          expect.objectContaining({
            customEntryPointUrls: [],
            customSitemapUrls: [],
            includeSitemapsInRobotsTxt: true,
            isDataLoading: true,
            isFlyoutVisible: true,
            selectedDomainUrls: [],
            selectedEntryPointUrls: [],
            selectedSitemapUrls: [],
          })
        );
      });

      it('fetches the latest data', () => {
        jest.spyOn(CrawlCustomSettingsFlyoutLogic.actions, 'fetchDomainConfigData');

        CrawlCustomSettingsFlyoutLogic.actions.showFlyout();

        expect(CrawlCustomSettingsFlyoutLogic.actions.fetchDomainConfigData).toHaveBeenCalled();
      });
    });

    describe('startCustomCrawl', () => {
      it('can start a custom crawl for selected domains', async () => {
        mount({
          includeSitemapsInRobotsTxt: true,
          maxCrawlDepth: 5,
          selectedDomainUrls: ['https://www.elastic.co', 'https://swiftype.com'],
        });
        jest.spyOn(CrawlerLogic.actions, 'startCrawl');

        CrawlCustomSettingsFlyoutLogic.actions.startCustomCrawl();
        await nextTick();

        expect(CrawlerLogic.actions.startCrawl).toHaveBeenCalledWith({
          domain_allowlist: ['https://www.elastic.co', 'https://swiftype.com'],
          max_crawl_depth: 5,
          sitemap_discovery_disabled: false,
        });
      });

      it('can start a custom crawl selected domains, sitemaps, and seed urls', async () => {
        mount({
          includeSitemapsInRobotsTxt: true,
          maxCrawlDepth: 5,
          selectedDomainUrls: ['https://www.elastic.co', 'https://swiftype.com'],
          selectedEntryPointUrls: [
            'https://www.elastic.co/guide',
            'https://swiftype.com/documentation',
          ],
          selectedSitemapUrls: [
            'https://www.elastic.co/sitemap1.xml',
            'https://swiftype.com/sitemap2.xml',
          ],
        });
        jest.spyOn(CrawlerLogic.actions, 'startCrawl');

        CrawlCustomSettingsFlyoutLogic.actions.startCustomCrawl();
        await nextTick();

        expect(CrawlerLogic.actions.startCrawl).toHaveBeenCalledWith({
          domain_allowlist: ['https://www.elastic.co', 'https://swiftype.com'],
          max_crawl_depth: 5,
          seed_urls: ['https://www.elastic.co/guide', 'https://swiftype.com/documentation'],
          sitemap_urls: [
            'https://www.elastic.co/sitemap1.xml',
            'https://swiftype.com/sitemap2.xml',
          ],
          sitemap_discovery_disabled: false,
        });
      });
    });

    describe('toggleIncludeSitemapsInRobotsTxt', () => {
      it('toggles the flag', () => {
        mount({
          includeSitemapsInRobotsTxt: false,
        });

        CrawlCustomSettingsFlyoutLogic.actions.toggleIncludeSitemapsInRobotsTxt();

        expect(CrawlCustomSettingsFlyoutLogic.values.includeSitemapsInRobotsTxt).toEqual(true);

        mount({
          includeSitemapsInRobotsTxt: true,
        });

        CrawlCustomSettingsFlyoutLogic.actions.toggleIncludeSitemapsInRobotsTxt();

        expect(CrawlCustomSettingsFlyoutLogic.values.includeSitemapsInRobotsTxt).toEqual(false);
      });
    });

    describe('[CrawlerLogic.actionTypes.startCrawl]', () => {
      it('enables loading state', () => {
        mount({
          isFormSubmitting: false,
        });

        CrawlerLogic.actions.startCrawl();

        expect(CrawlCustomSettingsFlyoutLogic.values.isFormSubmitting).toBe(true);
      });
    });

    describe('[CrawlerLogic.actionTypes.onStartCrawlRequestComplete]', () => {
      it('disables loading state and hides the modal', () => {
        mount({
          isFormSubmitting: true,
          isFlyoutVisible: true,
        });

        CrawlerLogic.actions.onStartCrawlRequestComplete();

        expect(CrawlCustomSettingsFlyoutLogic.values.isFormSubmitting).toBe(false);
        expect(CrawlCustomSettingsFlyoutLogic.values.isFlyoutVisible).toBe(false);
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
        selectedDomainUrls: ['https://swiftype.com'],
      });
    });

    describe('domainUrls', () => {
      it('contains all the domain urls from the domain config', () => {
        expect(CrawlCustomSettingsFlyoutLogic.values.domainUrls).toEqual([
          'https://www.elastic.co',
          'https://swiftype.com',
        ]);
      });
    });

    describe('domainConfigMap', () => {
      it('contains all the domain urls from the domain config', () => {
        expect(CrawlCustomSettingsFlyoutLogic.values.domainConfigMap).toEqual({
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

    describe('entryPointUrls', () => {
      it('contains all the sitemap urls from selected domains', () => {
        expect(CrawlCustomSettingsFlyoutLogic.values.entryPointUrls).toEqual([
          'https://swiftype.com/',
          'https://swiftype.com/documentation',
        ]);
      });
    });

    describe('sitemapUrls', () => {
      it('contains all the sitemap urls from selected domains', () => {
        expect(CrawlCustomSettingsFlyoutLogic.values.sitemapUrls).toEqual([
          'https://swiftype.com/sitemap1.xml',
          'https://swiftype.com/sitemap2.xml',
        ]);
      });
    });
  });
});

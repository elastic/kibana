/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { DomainConfig, CustomCrawlType } from '../../../../api/crawler/types';
import { IndexNameLogic } from '../../index_name_logic';
import { IndexViewLogic } from '../../index_view_logic';
import { CrawlerLogic } from '../crawler_logic';

import { CrawlCustomSettingsFlyoutDomainConfigLogic } from './crawl_custom_settings_flyout_domain_logic';
import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

describe('CrawlCustomSettingsFlyoutLogic', () => {
  const { mount } = new LogicMounter(CrawlCustomSettingsFlyoutLogic);
  const { mount: indexViewLogicMount } = new LogicMounter(IndexViewLogic);
  const { mount: indexNameMount } = new LogicMounter(IndexNameLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    indexViewLogicMount();
    indexNameMount();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlCustomSettingsFlyoutLogic.values).toEqual({
      crawlType: CustomCrawlType.ONE_TIME,
      customEntryPointUrls: [],
      customSitemapUrls: [],
      domainConfigMap: {},
      domainConfigs: [],
      entryPointUrls: [],
      includeSitemapsInRobotsTxt: true,
      isDataLoading: true,
      isFlyoutVisible: false,
      isFormSubmitting: false,
      isSingleCrawlType: true,
      maxCrawlDepth: 2,
      selectedDomainUrls: [],
      selectedEntryPointUrls: [],
      selectedSitemapUrls: [],
      sitemapUrls: [],
    });
  });

  describe('actions', () => {
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
        CrawlerLogic.mount();
        jest.spyOn(CrawlCustomSettingsFlyoutLogic.actions, 'startCrawl');

        CrawlCustomSettingsFlyoutLogic.actions.startCustomCrawl();
        await nextTick();

        expect(CrawlCustomSettingsFlyoutLogic.actions.startCrawl).toHaveBeenCalledWith({
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
        CrawlerLogic.mount();
        jest.spyOn(CrawlCustomSettingsFlyoutLogic.actions, 'startCrawl');

        CrawlCustomSettingsFlyoutLogic.actions.startCustomCrawl();
        await nextTick();

        expect(CrawlCustomSettingsFlyoutLogic.actions.startCrawl).toHaveBeenCalledWith({
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
  });

  describe('selectors', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mount({
        selectedDomainUrls: ['https://swiftype.com'],
      });
      CrawlCustomSettingsFlyoutDomainConfigLogic.actions.onRecieveDomainConfigData([
        {
          id: '1',
          name: 'https://www.elastic.co',
          sitemapUrls: [
            'https://www.elastic.co/sitemap1.xml',
            'https://www.elastic.co/sitemap2.xml',
          ],
          seedUrls: ['https://www.elastic.co/', 'https://www.elastic.co/guide'],
        },
        {
          id: '2',
          name: 'https://swiftype.com',
          sitemapUrls: ['https://swiftype.com/sitemap1.xml', 'https://swiftype.com/sitemap2.xml'],
          seedUrls: ['https://swiftype.com/', 'https://swiftype.com/documentation'],
        },
      ]);
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

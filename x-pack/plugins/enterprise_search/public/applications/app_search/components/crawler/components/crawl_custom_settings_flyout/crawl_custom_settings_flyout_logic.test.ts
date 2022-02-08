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
      isDataLoading: true,
      isFlyoutVisible: false,
      isFormSubmitting: false,
      domainConfigs: [],
      domainUrls: [],
      selectedDomainUrls: [],
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

    describe('onSelectDomainUrls', () => {
      it('saves the urls', () => {
        mount({
          selectedDomainUrls: [],
        });

        CrawlCustomSettingsFlyoutLogic.actions.onSelectDomainUrls([
          'https://www.elastic.co',
          'https://www.swiftype.com',
        ]);

        expect(CrawlCustomSettingsFlyoutLogic.values.selectedDomainUrls).toEqual([
          'https://www.elastic.co',
          'https://www.swiftype.com',
        ]);
      });
    });

    describe('showFlyout', () => {
      it('shows the modal', () => {
        CrawlCustomSettingsFlyoutLogic.actions.showFlyout();

        expect(CrawlCustomSettingsFlyoutLogic.values.isFlyoutVisible).toBe(true);
      });

      it('resets the selected options', () => {
        mount({
          selectedDomainUrls: ['https://www.elastic.co', 'https://www.swiftype.com'],
        });

        CrawlCustomSettingsFlyoutLogic.actions.showFlyout();

        expect(CrawlCustomSettingsFlyoutLogic.values.selectedDomainUrls).toEqual([]);
      });

      it('fetches the latest data', () => {
        jest.spyOn(CrawlCustomSettingsFlyoutLogic.actions, 'fetchDomainConfigData');

        CrawlCustomSettingsFlyoutLogic.actions.showFlyout();

        expect(CrawlCustomSettingsFlyoutLogic.actions.fetchDomainConfigData).toHaveBeenCalled();
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
    describe('domainUrls', () => {
      it('contains all the domain urls from the domain config', () => {
        mount({
          domainConfigs: [
            {
              name: 'https://www.elastic.co',
            },
            {
              name: 'https://swiftype.com',
            },
          ],
        });

        expect(CrawlCustomSettingsFlyoutLogic.values.domainUrls).toEqual([
          'https://www.elastic.co',
          'https://swiftype.com',
        ]);
      });
    });
  });
});

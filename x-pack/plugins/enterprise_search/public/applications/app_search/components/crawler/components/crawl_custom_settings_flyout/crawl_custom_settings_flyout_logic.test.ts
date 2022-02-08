/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { CrawlerLogic } from '../../crawler_logic';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

describe('CrawlCustomSettingsFlyoutLogic', () => {
  const { mount } = new LogicMounter(CrawlCustomSettingsFlyoutLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlCustomSettingsFlyoutLogic.values).toEqual({
      isDataLoading: false,
      isFlyoutVisible: false,
      selectedDomainUrls: [],
    });
  });

  describe('actions', () => {
    describe('hideFlyout', () => {
      it('hides the modal', () => {
        CrawlCustomSettingsFlyoutLogic.actions.hideFlyout();

        expect(CrawlCustomSettingsFlyoutLogic.values.isFlyoutVisible).toBe(false);
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

    describe('[CrawlerLogic.actionTypes.startCrawl]', () => {
      it('enables loading state', () => {
        mount({
          isDataLoading: false,
        });

        CrawlerLogic.actions.startCrawl();

        expect(CrawlCustomSettingsFlyoutLogic.values.isDataLoading).toBe(true);
      });
    });

    describe('[CrawlerLogic.actionTypes.onStartCrawlRequestComplete]', () => {
      it('disables loading state and hides the modal', () => {
        mount({
          isDataLoading: true,
          isFlyoutVisible: true,
        });

        CrawlerLogic.actions.onStartCrawlRequestComplete();

        expect(CrawlCustomSettingsFlyoutLogic.values.isDataLoading).toBe(false);
        expect(CrawlCustomSettingsFlyoutLogic.values.isFlyoutVisible).toBe(false);
      });
    });
  });
});

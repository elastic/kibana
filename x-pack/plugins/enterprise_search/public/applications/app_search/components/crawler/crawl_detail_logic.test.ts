/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { CrawlDetailLogic, CrawlDetailValues } from './crawl_detail_logic';
import { CrawlerStatus, CrawlEventFromServer, CrawlType } from './types';
import { crawlEventServerToClient } from './utils';

const DEFAULT_VALUES: CrawlDetailValues = {
  dataLoading: true,
  flyoutClosed: true,
  crawlEvent: null,
  crawlEventFromServer: null,
  selectedTab: 'preview',
};

const crawlEventResponse: CrawlEventFromServer = {
  id: '12345',
  status: CrawlerStatus.Pending,
  created_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
  began_at: null,
  completed_at: null,
  stage: 'crawl',
  type: CrawlType.Full,
  crawl_config: {
    domain_allowlist: [],
  },
};

const clientCrawlEvent = crawlEventServerToClient(crawlEventResponse);

describe('CrawlDetailLogic', () => {
  const { mount } = new LogicMounter(CrawlDetailLogic);
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(CrawlDetailLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('closeFlyout', () => {
      it('closes the flyout', () => {
        mount({ flyoutClosed: false });

        CrawlDetailLogic.actions.closeFlyout();

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          flyoutClosed: true,
        });
      });
    });

    describe('onRecieveCrawlEvent', () => {
      it('saves the crawl request and sets data loading to false', () => {
        mount({
          dataLoading: true,
          request: null,
        });

        CrawlDetailLogic.actions.onRecieveCrawlEvent(crawlEventResponse);

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          crawlEventFromServer: crawlEventResponse,
          crawlEvent: clientCrawlEvent,
        });
      });
    });

    describe('setSelectedTab', () => {
      it('sets the select tab', () => {
        mount({
          selectedTab: 'preview',
        });

        CrawlDetailLogic.actions.setSelectedTab('json');

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          selectedTab: 'json',
        });
      });
    });

    describe('openFlyout', () => {
      it('opens the flyout and resets the selected tab', () => {
        mount({
          flyoutClosed: true,
          selectedTab: 'json',
        });

        CrawlDetailLogic.actions.openFlyout();

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          flyoutClosed: false,
          selectedTab: 'preview',
        });
      });
    });

    describe('fetchCrawlEvent', () => {
      it('sets loading to true', () => {
        mount({
          dataLoading: false,
        });

        CrawlDetailLogic.actions.fetchCrawlEvent('12345');

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('updates logic with data that has been converted from server to client', async () => {
        mount();
        jest.spyOn(CrawlDetailLogic.actions, 'onRecieveCrawlEvent');

        http.get.mockReturnValueOnce(Promise.resolve(crawlEventResponse));

        CrawlDetailLogic.actions.fetchCrawlEvent('12345');
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/crawl_requests/12345'
        );
        expect(CrawlDetailLogic.actions.onRecieveCrawlEvent).toHaveBeenCalledWith(
          crawlEventResponse
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        CrawlDetailLogic.actions.fetchCrawlEvent('12345');
      });
    });
  });
});

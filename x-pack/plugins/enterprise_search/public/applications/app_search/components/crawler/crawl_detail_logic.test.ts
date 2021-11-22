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
import { CrawlerStatus, CrawlRequestFromServer } from './types';
import { crawlRequestServerToClient } from './utils';

const DEFAULT_VALUES: CrawlDetailValues = {
  dataLoading: true,
  flyoutClosed: true,
  crawlRequest: null,
  crawlRequestFromServer: null,
};

const crawlRequestResponse: CrawlRequestFromServer = {
  id: '12345',
  status: CrawlerStatus.Pending,
  created_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
  began_at: null,
  completed_at: null,
};

const clientCrawlRequest = crawlRequestServerToClient(crawlRequestResponse);

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

  describe('reducers', () => {
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

    describe('onRecieveCrawlRequest', () => {
      it('saves the crawl request and sets data loading to false', () => {
        mount({
          dataLoading: true,
          request: null,
        });

        CrawlDetailLogic.actions.onRecieveCrawlRequest(crawlRequestResponse);

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          crawlRequestFromServer: crawlRequestResponse,
          crawlRequest: clientCrawlRequest,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('fetchCrawlRequest', () => {
      it('opens the flyout and sets loading to true', () => {
        mount({
          dataLoading: false,
          flyoutClosed: true,
        });

        CrawlDetailLogic.actions.fetchCrawlRequest('12345');

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
          flyoutClosed: false,
        });
      });

      it('updates logic with data that has been converted from server to client', async () => {
        mount();
        jest.spyOn(CrawlDetailLogic.actions, 'onRecieveCrawlRequest');

        http.get.mockReturnValueOnce(Promise.resolve(crawlRequestResponse));

        CrawlDetailLogic.actions.fetchCrawlRequest('12345');
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/crawl_requests/12345'
        );
        expect(CrawlDetailLogic.actions.onRecieveCrawlRequest).toHaveBeenCalledWith(
          crawlRequestResponse
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        CrawlDetailLogic.actions.fetchCrawlRequest('12345');
      });
    });
  });
});

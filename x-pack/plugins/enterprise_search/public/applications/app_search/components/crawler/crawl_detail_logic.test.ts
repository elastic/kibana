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

import { nextTick } from '@kbn/test/jest';

import { CrawlDetailLogic, CrawlDetailValues } from './crawl_detail_logic';
import { CrawlerStatus, CrawlRequestFromServer } from './types';
import { crawlRequestServerToClient } from './utils';

const DEFAULT_VALUES: CrawlDetailValues = {
  dataLoading: true,
  flyoutHidden: true,
  request: null,
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
  const { flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(CrawlDetailLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('reducers', () => {
    describe('hideFlyout', () => {
      it('closes the flyout', () => {
        mount({ flyoutHidden: false });

        CrawlDetailLogic.actions.hideFlyout();

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          flyoutHidden: true,
        });
      });
    });

    describe('fetchCrawlRequest', () => {
      it('opens the flyout and sets loading to true', () => {
        mount({
          dataLoading: false,
          flyoutHidden: true,
        });

        CrawlDetailLogic.actions.fetchCrawlRequest('12345');

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
          flyoutHidden: false,
        });
      });
    });

    describe('onRecieveCrawlRequest', () => {
      it('saves the crawl request and sets data loading to false', () => {
        mount({
          dataLoading: true,
          request: null,
        });

        CrawlDetailLogic.actions.onRecieveCrawlRequest(clientCrawlRequest);

        expect(CrawlDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          request: clientCrawlRequest,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('fetchCrawlRequest', () => {
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
          clientCrawlRequest
        );
      });

      it('displays any errors to the user', async () => {
        mount();
        http.get.mockReturnValueOnce(Promise.reject('error'));

        CrawlDetailLogic.actions.fetchCrawlRequest('12345');
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});

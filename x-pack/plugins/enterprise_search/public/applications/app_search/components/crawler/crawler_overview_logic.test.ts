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

jest.mock('./crawler_logic', () => ({
  CrawlerLogic: {
    actions: {
      onReceiveCrawlerData: jest.fn(),
    },
  },
}));

import { nextTick } from '@kbn/test/jest';

import { CrawlerLogic } from './crawler_logic';
import { CrawlerOverviewLogic } from './crawler_overview_logic';

import { CrawlerDataFromServer, CrawlerDomain } from './types';
import { crawlerDataServerToClient } from './utils';

const MOCK_SERVER_CRAWLER_DATA: CrawlerDataFromServer = {
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

const MOCK_CLIENT_CRAWLER_DATA = crawlerDataServerToClient(MOCK_SERVER_CRAWLER_DATA);

describe('CrawlerOverviewLogic', () => {
  const { mount } = new LogicMounter(CrawlerOverviewLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  describe('listeners', () => {
    describe('deleteDomain', () => {
      it('calls onReceiveCrawlerData with retrieved data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerLogic.actions, 'onReceiveCrawlerData');
        http.delete.mockReturnValue(Promise.resolve(MOCK_SERVER_CRAWLER_DATA));

        CrawlerOverviewLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
        await nextTick();

        expect(http.delete).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/domains/1234',
          {
            query: { respond_with: 'crawler_details' },
          }
        );
        expect(CrawlerLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith(
          MOCK_CLIENT_CRAWLER_DATA
        );
        expect(flashSuccessToast).toHaveBeenCalled();
      });

      it('calls flashApiErrors when there is an error', async () => {
        http.delete.mockReturnValue(Promise.reject('error'));

        CrawlerOverviewLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});

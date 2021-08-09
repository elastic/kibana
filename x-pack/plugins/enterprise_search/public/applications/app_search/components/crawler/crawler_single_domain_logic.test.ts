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

import { CrawlerSingleDomainLogic, CrawlerSingleDomainValues } from './crawler_single_domain_logic';
import { CrawlerDomain } from './types';

const DEFAULT_VALUES: CrawlerSingleDomainValues = {
  dataLoading: true,
  domain: null,
};

describe('CrawlerSingleDomainLogic', () => {
  const { mount } = new LogicMounter(CrawlerSingleDomainLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

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
  });

  describe('listeners', () => {
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
          '/api/app_search/engines/some-engine/crawler/domains/507f1f77bcf86cd799439011'
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

      it('displays any errors to the user', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));

        CrawlerSingleDomainLogic.actions.fetchDomainData('507f1f77bcf86cd799439011');
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';
import { set } from 'lodash/fp';

import { CrawlDetailValues } from '../../crawl_detail_logic';
import { CrawlerStatus, CrawlType } from '../../types';

import { AccordionList } from './accordion_list';
import { CrawlDetailsPreview } from './crawl_details_preview';
import { CrawlDetailsSummary } from './crawl_details_summary';

const MOCK_VALUES: Partial<CrawlDetailValues> = {
  crawlRequest: {
    id: '507f1f77bcf86cd799439011',
    status: CrawlerStatus.Pending,
    createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
    beganAt: null,
    completedAt: null,
    type: CrawlType.Full,
    crawlConfig: {
      domainAllowlist: ['https://www.elastic.co', 'https://www.swiftype.com'],
      seedUrls: ['https://www.elastic.co/docs', 'https://www.swiftype.com/documentation'],
      sitemapUrls: ['https://www.elastic.co/sitemap.xml', 'https://www.swiftype.com/sitemap.xml'],
      maxCrawlDepth: 10,
    },
    stats: {
      status: {
        urlsAllowed: 10,
        pagesVisited: 10,
        crawlDurationMSec: 36000,
        avgResponseTimeMSec: 100,
      },
    },
  },
};

describe('CrawlDetailsPreview', () => {
  it('is empty when a crawl request has not been loaded', () => {
    setMockValues({
      crawlRequest: null,
    });

    const wrapper = shallow(<CrawlDetailsPreview crawlerLogsEnabled />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('when a crawl request has been loaded', () => {
    let wrapper: ShallowWrapper;

    beforeEach(() => {
      setMockValues(MOCK_VALUES);
      wrapper = shallow(<CrawlDetailsPreview crawlerLogsEnabled />);
    });

    it('contains a summary', () => {
      const summary = wrapper.find(CrawlDetailsSummary);
      expect(summary.props()).toEqual({
        crawlDepth: 10,
        crawlType: 'full',
        crawlerLogsEnabled: true,
        domainCount: 2,
        stats: {
          status: {
            avgResponseTimeMSec: 100,
            crawlDurationMSec: 36000,
            pagesVisited: 10,
            urlsAllowed: 10,
          },
        },
      });
    });

    it('will default values on summary if missing', () => {
      const values = set('crawlRequest.stats', undefined, MOCK_VALUES);
      setMockValues(values);
      wrapper = shallow(<CrawlDetailsPreview crawlerLogsEnabled={undefined} />);

      const summary = wrapper.find(CrawlDetailsSummary);
      expect(summary.prop('crawlerLogsEnabled')).toEqual(false);
      expect(summary.prop('stats')).toEqual(null);
    });

    it('contains a list of domains', () => {
      const domainList = wrapper.find(AccordionList).at(0);

      expect(domainList.prop('items')).toEqual([
        'https://www.elastic.co',
        'https://www.swiftype.com',
      ]);
    });

    it('contains a list of seed urls', () => {
      const seedUrlList = wrapper.find(AccordionList).at(1);

      expect(seedUrlList.prop('items')).toEqual([
        'https://www.elastic.co/docs',
        'https://www.swiftype.com/documentation',
      ]);
    });

    it('contains a list of sitemap urls', () => {
      const sitemapUrlList = wrapper.find(AccordionList).at(2);

      expect(sitemapUrlList.prop('items')).toEqual([
        'https://www.elastic.co/sitemap.xml',
        'https://www.swiftype.com/sitemap.xml',
      ]);
    });
  });
});

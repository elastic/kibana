/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { CrawlDetailValues } from '../../crawl_detail_logic';
import { CrawlerStatus, CrawlType } from '../../types';

import { AccordionList } from './accordion_list';
import { CrawlDetailsPreview } from './crawl_details_preview';

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
    },
  },
};

describe('CrawlDetailsPreview', () => {
  it('is empty when a crawl request has not been loaded', () => {
    setMockValues({
      crawlRequest: null,
    });

    const wrapper = shallow(<CrawlDetailsPreview />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('when a crawl request has been loaded', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      setMockValues(MOCK_VALUES);
      wrapper = shallow(<CrawlDetailsPreview />);
    });

    it('contains a list of domains', () => {
      const domainList = wrapper.find(AccordionList).at(0);

      expect(domainList.prop('items')).toEqual([
        'https://www.elastic.co',
        'https://www.swiftype.com',
      ]);
    });

    it('contains a list of seed urls', () => {
      const domainList = wrapper.find(AccordionList).at(1);

      expect(domainList.prop('items')).toEqual([
        'https://www.elastic.co/docs',
        'https://www.swiftype.com/documentation',
      ]);
    });
  });
});

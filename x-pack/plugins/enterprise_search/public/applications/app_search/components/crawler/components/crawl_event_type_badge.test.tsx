/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import '../../../__mocks__/engine_logic.mock';

import { shallow } from 'enzyme';

import { EuiBadge } from '@elastic/eui';

import { mountWithIntl } from '../../../../test_helpers';

import { CrawlEvent, CrawlerStatus, CrawlType } from '../types';

import { CrawlEventTypeBadge } from './crawl_event_type_badge';

const MOCK_EVENT: CrawlEvent = {
  id: '618d0e66abe97bc688328900',
  status: CrawlerStatus.Pending,
  stage: 'crawl',
  createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
  beganAt: null,
  completedAt: null,
  type: CrawlType.Full,
  crawlConfig: {
    domainAllowlist: ['https://www.elastic.co'],
    seedUrls: [],
    sitemapUrls: [],
    maxCrawlDepth: 10,
  },
};

describe('CrawlEventTypeBadge', () => {
  it('renders a badge for process crawls', () => {
    const wrapper = mountWithIntl(
      <CrawlEventTypeBadge event={{ ...MOCK_EVENT, stage: 'process' }} />
    );

    const badge = wrapper.find(EuiBadge);
    expect(badge.prop('color')).toEqual('hollow');
    expect(badge.text()).toEqual('Re-applied crawl rules');
  });

  it('renders a badge for partial crawls', () => {
    const wrapper = mountWithIntl(
      <CrawlEventTypeBadge event={{ ...MOCK_EVENT, type: CrawlType.Partial }} />
    );

    const badge = wrapper.find(EuiBadge);
    expect(badge.prop('color')).toEqual('hollow');
    expect(badge.text()).toEqual('Partial');
  });

  it('renders a badge for full crawls', () => {
    const wrapper = mountWithIntl(
      <CrawlEventTypeBadge event={{ ...MOCK_EVENT, type: CrawlType.Full }} />
    );

    const badge = wrapper.find(EuiBadge);
    expect(badge.prop('color')).toBeUndefined();
    expect(badge.text()).toEqual('Full');
  });

  it('is empty by default', () => {
    const wrapper = shallow(<CrawlEventTypeBadge event={{} as CrawlEvent} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});

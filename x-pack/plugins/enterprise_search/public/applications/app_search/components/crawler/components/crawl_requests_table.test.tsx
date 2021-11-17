/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiBadge, EuiBasicTable, EuiEmptyPrompt } from '@elastic/eui';

import { mountWithIntl } from '../../../../test_helpers';

import { CrawlEvent, CrawlerStatus, CrawlType } from '../types';

import { CrawlRequestsTable, CrawlEventTypeBadge } from './crawl_requests_table';

const MOCK_EVENT: CrawlEvent = {
  id: '618d0e66abe97bc688328900',
  status: CrawlerStatus.Pending,
  stage: 'crawl',
  createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
  beganAt: null,
  completedAt: null,
  type: CrawlType.Full,
};

const values: { events: CrawlEvent[] } = {
  // CrawlerLogic
  events: [MOCK_EVENT],
};

describe('CrawlRequestsTable', () => {
  let wrapper: ShallowWrapper;
  let tableContent: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('columns', () => {
    beforeAll(() => {
      setMockValues(values);
      wrapper = shallow(<CrawlRequestsTable />);
      tableContent = mountWithIntl(<CrawlRequestsTable />)
        .find(EuiBasicTable)
        .text();
    });

    it('renders an id column', () => {
      expect(tableContent).toContain('618d0e66abe97bc688328900');
    });

    it('renders a created at column', () => {
      expect(tableContent).toContain('Created');
      expect(tableContent).toContain('Aug 31, 2020');
    });

    it('renders a type column', () => {
      expect(tableContent).toContain('Crawl Type');
      expect(tableContent).toContain('Full');
    });

    it('renders a status column', () => {
      expect(tableContent).toContain('Status');
      expect(tableContent).toContain('Pending');
    });
  });

  describe('no items message', () => {
    it('displays an empty prompt when there are no crawl requests', () => {
      setMockValues({
        ...values,
        events: [],
      });

      wrapper = shallow(<CrawlRequestsTable />);

      expect(wrapper.find(EuiBasicTable).dive().find(EuiEmptyPrompt)).toHaveLength(1);
    });
  });
});

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

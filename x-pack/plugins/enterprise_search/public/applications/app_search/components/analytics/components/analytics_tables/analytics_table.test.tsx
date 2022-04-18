/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/kea_logic';
import '../../../../../__mocks__/react_router';
import '../../../../__mocks__/engine_logic.mock';

import React from 'react';

import { EuiBasicTable, EuiBadge, EuiEmptyPrompt } from '@elastic/eui';

import { mountWithIntl } from '../../../../../test_helpers';

import { runActionColumnTests } from './test_helpers/shared_columns_tests';

import { AnalyticsTable } from '.';

describe('AnalyticsTable', () => {
  const items = [
    {
      key: 'some search',
      tags: ['tagA'],
      searches: { doc_count: 100 },
      clicks: { doc_count: 10 },
    },
    {
      key: 'another search',
      tags: ['tagB'],
      searches: { doc_count: 99 },
      clicks: { doc_count: 9 },
    },
    {
      key: '',
      tags: ['tagA', 'tagB'],
      searches: { doc_count: 1 },
      clicks: { doc_count: 0 },
    },
  ];

  it('renders', () => {
    const wrapper = mountWithIntl(<AnalyticsTable items={items} />);
    const tableContent = wrapper.find(EuiBasicTable).text();

    expect(tableContent).toContain('Search term');
    expect(tableContent).toContain('some search');
    expect(tableContent).toContain('another search');
    expect(tableContent).toContain('""');

    expect(tableContent).toContain('Analytics tags');
    expect(tableContent).toContain('tagA');
    expect(tableContent).toContain('tagB');
    expect(wrapper.find(EuiBadge)).toHaveLength(4);

    expect(tableContent).toContain('Queries');
    expect(tableContent).toContain('100');
    expect(tableContent).toContain('99');
    expect(tableContent).toContain('1');
    expect(tableContent).not.toContain('Clicks');
  });

  it('renders a clicks column if hasClicks is passed', () => {
    const wrapper = mountWithIntl(<AnalyticsTable items={items} hasClicks />);
    const tableContent = wrapper.find(EuiBasicTable).text();

    expect(tableContent).toContain('Clicks');
    expect(tableContent).toContain('10');
    expect(tableContent).toContain('9');
    expect(tableContent).toContain('0');
  });

  it('renders tag counts instead of tag names if isSmall is passed', () => {
    const wrapper = mountWithIntl(<AnalyticsTable items={items} isSmall />);
    const tableContent = wrapper.find(EuiBasicTable).text();

    expect(tableContent).toContain('Analytics tags');
    expect(tableContent).toContain('1 tag');
    expect(tableContent).toContain('2 tags');
    expect(wrapper.find(EuiBadge)).toHaveLength(3);
  });

  describe('renders an action column', () => {
    const wrapper = mountWithIntl(<AnalyticsTable items={items} />);
    runActionColumnTests(wrapper);
  });

  it('renders an empty prompt if no items are passed', () => {
    const wrapper = mountWithIntl(<AnalyticsTable items={[]} />);
    const promptContent = wrapper.find(EuiEmptyPrompt).text();

    expect(promptContent).toContain('No queries were performed during this time period.');
  });
});

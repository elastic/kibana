/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl, mockKibanaValues } from '../../../../../__mocks__';
import '../../../../__mocks__/engine_logic.mock';

import React from 'react';
import { EuiBasicTable, EuiBadge, EuiEmptyPrompt } from '@elastic/eui';

import { AnalyticsTable } from './';

describe('AnalyticsTable', () => {
  const { navigateToUrl } = mockKibanaValues;

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

  it('renders an action column', () => {
    const wrapper = mountWithIntl(<AnalyticsTable items={items} />);
    const viewQuery = wrapper.find('[data-test-subj="AnalyticsTableViewQueryButton"]').first();
    const editQuery = wrapper.find('[data-test-subj="AnalyticsTableEditQueryButton"]').first();

    viewQuery.simulate('click');
    expect(navigateToUrl).toHaveBeenCalledWith(
      '/engines/some-engine/analytics/query_detail/some%20search'
    );

    editQuery.simulate('click');
    // TODO
  });

  it('renders an empty prompt if no items are passed', () => {
    const wrapper = mountWithIntl(<AnalyticsTable items={[]} />);
    const promptContent = wrapper.find(EuiEmptyPrompt).text();

    expect(promptContent).toContain('No queries were performed during this time period.');
  });
});

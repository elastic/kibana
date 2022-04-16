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

import { RecentQueriesTable } from '.';

describe('RecentQueriesTable', () => {
  const items = [
    {
      query_string: 'some search',
      timestamp: '1970-01-03T12:00:00Z',
      tags: ['tagA'],
      document_ids: ['documentA', 'documentB'],
    },
    {
      query_string: 'another search',
      timestamp: '1970-01-02T12:00:00Z',
      tags: ['tagB'],
      document_ids: ['documentC'],
    },
    {
      query_string: '',
      timestamp: '1970-01-01T12:00:00Z',
      tags: ['tagA', 'tagB'],
      document_ids: ['documentA', 'documentB', 'documentC'],
    },
  ];

  it('renders', () => {
    const wrapper = mountWithIntl(<RecentQueriesTable items={items} />);
    const tableContent = wrapper.find(EuiBasicTable).text();

    expect(tableContent).toContain('Search term');
    expect(tableContent).toContain('some search');
    expect(tableContent).toContain('another search');
    expect(tableContent).toContain('""');

    expect(tableContent).toContain('Time');
    expect(tableContent).toContain('Jan 3, 1970');
    expect(tableContent).toContain('Jan 2, 1970');
    expect(tableContent).toContain('Jan 1, 1970');

    expect(tableContent).toContain('Analytics tags');
    expect(tableContent).toContain('tagA');
    expect(tableContent).toContain('tagB');
    expect(wrapper.find(EuiBadge)).toHaveLength(4);

    expect(tableContent).toContain('Results');
    expect(tableContent).toContain('2');
    expect(tableContent).toContain('1');
    expect(tableContent).toContain('3');
  });

  describe('renders an action column', () => {
    const wrapper = mountWithIntl(<RecentQueriesTable items={items} />);
    runActionColumnTests(wrapper);
  });

  it('renders an empty prompt if no items are passed', () => {
    const wrapper = mountWithIntl(<RecentQueriesTable items={[]} />);
    const promptContent = wrapper.find(EuiEmptyPrompt).text();

    expect(promptContent).toContain('No recent queries');
    expect(promptContent).toContain('Queries will appear here as they are received.');
  });
});

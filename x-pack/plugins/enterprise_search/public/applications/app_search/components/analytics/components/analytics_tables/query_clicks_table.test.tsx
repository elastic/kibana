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

import { EuiBasicTable, EuiLink, EuiBadge, EuiEmptyPrompt } from '@elastic/eui';

import { mountWithIntl } from '../../../../../test_helpers';

import { QueryClicksTable } from '.';

describe('QueryClicksTable', () => {
  const items = [
    {
      key: 'some-document',
      document: {
        engine: 'some-engine',
        id: 'some-document',
      },
      tags: ['tagA'],
      doc_count: 10,
    },
    {
      key: 'another-document',
      document: {
        engine: 'another-engine',
        id: 'another-document',
      },
      tags: ['tagB'],
      doc_count: 5,
    },
    {
      key: 'deleted-document',
      tags: [],
      doc_count: 1,
    },
  ];

  it('renders', () => {
    const wrapper = mountWithIntl(<QueryClicksTable items={items} />);
    const tableContent = wrapper.find(EuiBasicTable).text();

    expect(tableContent).toContain('Documents');
    expect(tableContent).toContain('some-document');
    expect(tableContent).toContain('another-document');
    expect(tableContent).toContain('deleted-document');

    expect(wrapper.find(EuiLink).first().prop('href')).toEqual(
      '/app/enterprise_search/engines/some-engine/documents/some-document'
    );
    expect(wrapper.find(EuiLink).last().prop('href')).toEqual(
      '/app/enterprise_search/engines/another-engine/documents/another-document'
    );
    // deleted-document should not have a link

    expect(tableContent).toContain('Analytics tags');
    expect(tableContent).toContain('tagA');
    expect(tableContent).toContain('tagB');
    expect(wrapper.find(EuiBadge)).toHaveLength(2);

    expect(tableContent).toContain('Clicks');
    expect(tableContent).toContain('10');
    expect(tableContent).toContain('5');
    expect(tableContent).toContain('1');
  });

  it('renders an empty prompt if no items are passed', () => {
    const wrapper = mountWithIntl(<QueryClicksTable items={[]} />);
    const promptContent = wrapper.find(EuiEmptyPrompt).text();

    expect(promptContent).toContain('No clicks');
    expect(promptContent).toContain('No documents have been clicked from this query.');
  });
});

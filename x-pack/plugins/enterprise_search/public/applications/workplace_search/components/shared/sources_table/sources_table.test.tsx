/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTable, EuiTableHeaderCell } from '@elastic/eui';

import { SourceRow } from '../source_row';

import { SourcesTable } from '.';

const onToggle = jest.fn();

describe('SourcesTable', () => {
  it('renders', () => {
    const wrapper = shallow(<SourcesTable sources={contentSources} />);

    expect(wrapper.find(EuiTable)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell)).toHaveLength(3);
    expect(wrapper.find(SourceRow)).toHaveLength(2);
  });

  it('renders "Searchable" header item when toggle fn present', () => {
    const wrapper = shallow(
      <SourcesTable onSearchableToggle={onToggle} isOrganization sources={contentSources} />
    );

    expect(wrapper.find(EuiTableHeaderCell)).toHaveLength(5);
  });
});

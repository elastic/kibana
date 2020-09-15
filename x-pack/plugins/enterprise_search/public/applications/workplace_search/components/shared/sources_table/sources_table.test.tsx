/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiTable } from '@elastic/eui';
import { TableHeader } from '../../../../shared/table_header/table_header';
import { contentSources } from '../../../__mocks__/content_sources.mock';

import { SourceRow } from '../source_row';

import { SourcesTable } from './';

const onToggle = jest.fn();

describe('SourcesTable', () => {
  it('renders', () => {
    const wrapper = shallow(<SourcesTable sources={contentSources} />);

    expect(wrapper.find(EuiTable)).toHaveLength(1);
    expect(wrapper.find(SourceRow)).toHaveLength(2);
  });

  it('renders "Searchable" header item when toggle fn present', () => {
    const wrapper = shallow(
      <SourcesTable onSearchableToggle={onToggle} sources={contentSources} />
    );

    expect(wrapper.find(TableHeader).prop('headerItems')).toContain('Searchable');
  });
});

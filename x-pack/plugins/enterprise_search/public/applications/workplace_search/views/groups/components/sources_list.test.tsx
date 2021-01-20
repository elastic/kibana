/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { SourcesList } from './sources_list';

import { EuiFilterSelectItem } from '@elastic/eui';

const addFilteredSource = jest.fn();
const removeFilteredSource = jest.fn();

const props = {
  contentSources,
  filteredSources: [],
  addFilteredSource,
  removeFilteredSource,
};

describe('SourcesList', () => {
  it('renders', () => {
    const wrapper = shallow(<SourcesList {...props} />);

    expect(wrapper.find(EuiFilterSelectItem)).toHaveLength(2);
  });

  it('handles adding item click when item unchecked', () => {
    const wrapper = shallow(<SourcesList {...props} />);
    wrapper.find(EuiFilterSelectItem).first().simulate('click');

    expect(addFilteredSource).toHaveBeenCalled();
  });

  it('handles removing item click when item checked', () => {
    const wrapper = shallow(<SourcesList {...props} filteredSources={['123']} />);
    wrapper.find(EuiFilterSelectItem).first().simulate('click');

    expect(removeFilteredSource).toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import type { FacetValue } from '@elastic/search-ui';

import { MultiCheckboxFacetsView } from './multi_checkbox_facets_view';

describe('MultiCheckboxFacetsView', () => {
  const props = {
    label: 'foo',
    options: [
      {
        value: 'value1',
        selected: false,
      },
      {
        value: 'value2',
        selected: false,
      },
    ] as FacetValue[],
    showMore: true,
    onMoreClick: jest.fn(),
    onRemove: jest.fn(),
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<MultiCheckboxFacetsView {...props} />);
    expect(wrapper.isEmptyRender()).toBe(false);
  });

  it('calls onMoreClick when more button is clicked', () => {
    const wrapper = shallow(<MultiCheckboxFacetsView {...props} />);
    wrapper.find('[data-test-subj="more"]').simulate('click');
    expect(props.onMoreClick).toHaveBeenCalled();
  });

  it('calls onSelect when an option is selected', () => {
    const wrapper = shallow(<MultiCheckboxFacetsView {...props} />);
    wrapper.find('[data-test-subj="checkbox-group"]').simulate('change', 'generated-id_1');
    expect(props.onSelect).toHaveBeenCalledWith('value2');
  });

  it('calls onRemove if the option was already selected', () => {
    const wrapper = shallow(
      <MultiCheckboxFacetsView
        {...{
          ...props,
          options: [
            {
              value: 'value1',
              selected: false,
            },
            {
              value: 'value2',
              selected: true,
            },
          ] as FacetValue[],
        }}
      />
    );
    wrapper.find('[data-test-subj="checkbox-group"]').simulate('change', 'generated-id_1');
    expect(props.onRemove).toHaveBeenCalledWith('value2');
  });

  it('it passes options to EuiCheckboxGroup, converting no values to the text "No Value"', () => {
    const wrapper = shallow(
      <MultiCheckboxFacetsView
        {...{
          ...props,
          options: [
            {
              value: 'value1',
              selected: true,
            },
            {
              value: '',
              selected: false,
            },
          ] as FacetValue[],
        }}
      />
    );
    const options = wrapper.find('[data-test-subj="checkbox-group"]').prop('options');
    expect(options).toEqual([
      { id: 'generated-id_0', label: 'value1' },
      { id: 'generated-id_1', label: '<No value>' },
    ]);
  });
});

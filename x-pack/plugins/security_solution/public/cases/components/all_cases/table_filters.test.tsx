/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CasesTableFilters } from './table_filters';
import { TestProviders } from '../../../common/mock';

import { useGetTags } from '../../containers/use_get_tags';
import { useGetReporters } from '../../containers/use_get_reporters';
import { DEFAULT_FILTER_OPTIONS } from '../../containers/use_get_cases';
jest.mock('../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline');
jest.mock('../../containers/use_get_reporters');
jest.mock('../../containers/use_get_tags');

const onFilterChanged = jest.fn();
const fetchReporters = jest.fn();
const fetchTags = jest.fn();
const setFilterRefetch = jest.fn();

const props = {
  countClosedCases: 1234,
  countOpenCases: 99,
  onFilterChanged,
  initial: DEFAULT_FILTER_OPTIONS,
  setFilterRefetch,
};
describe('CasesTableFilters ', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useGetTags as jest.Mock).mockReturnValue({ tags: ['coke', 'pepsi'], fetchTags });
    (useGetReporters as jest.Mock).mockReturnValue({
      reporters: ['casetester'],
      respReporters: [{ username: 'casetester' }],
      isLoading: true,
      isError: false,
      fetchReporters,
    });
  });
  it('should render the initial case count', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="open-case-count"]`).last().text()).toEqual(
      'Open cases (99)'
    );
    expect(wrapper.find(`[data-test-subj="closed-case-count"]`).last().text()).toEqual(
      'Closed cases (1234)'
    );
  });
  it('should call onFilterChange when selected tags change', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="options-filter-popover-button-Tags"]`).last().simulate('click');
    wrapper.find(`[data-test-subj="options-filter-popover-item-0"]`).last().simulate('click');

    expect(onFilterChanged).toBeCalledWith({ tags: ['coke'] });
  });
  it('should call onFilterChange when selected reporters change', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );
    wrapper
      .find(`[data-test-subj="options-filter-popover-button-Reporter"]`)
      .last()
      .simulate('click');

    wrapper.find(`[data-test-subj="options-filter-popover-item-0"]`).last().simulate('click');

    expect(onFilterChanged).toBeCalledWith({ reporters: [{ username: 'casetester' }] });
  });
  it('should call onFilterChange when search changes', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );

    wrapper
      .find(`[data-test-subj="search-cases"]`)
      .last()
      .simulate('keyup', { key: 'Enter', target: { value: 'My search' } });
    expect(onFilterChanged).toBeCalledWith({ search: 'My search' });
  });
  it('should call onFilterChange when status toggled', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="closed-case-count"]`).last().simulate('click');

    expect(onFilterChanged).toBeCalledWith({ status: 'closed' });
  });
  it('should call on load setFilterRefetch', () => {
    mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );
    expect(setFilterRefetch).toHaveBeenCalled();
  });
  it('should remove tag from selected tags when tag no longer exists', () => {
    const ourProps = {
      ...props,
      initial: {
        ...DEFAULT_FILTER_OPTIONS,
        tags: ['pepsi', 'rc'],
      },
    };
    mount(
      <TestProviders>
        <CasesTableFilters {...ourProps} />
      </TestProviders>
    );
    expect(onFilterChanged).toHaveBeenCalledWith({ tags: ['pepsi'] });
  });
  it('should remove reporter from selected reporters when reporter no longer exists', () => {
    const ourProps = {
      ...props,
      initial: {
        ...DEFAULT_FILTER_OPTIONS,
        reporters: [
          { username: 'casetester', full_name: null, email: null },
          { username: 'batman', full_name: null, email: null },
        ],
      },
    };
    mount(
      <TestProviders>
        <CasesTableFilters {...ourProps} />
      </TestProviders>
    );
    expect(onFilterChanged).toHaveBeenCalledWith({ reporters: [{ username: 'casetester' }] });
  });
});

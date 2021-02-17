/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../../../case/common/api';
import { TestProviders } from '../../../common/mock';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetReporters } from '../../containers/use_get_reporters';
import { DEFAULT_FILTER_OPTIONS } from '../../containers/use_get_cases';
import { CasesTableFilters } from './table_filters';

jest.mock('../../containers/use_get_reporters');
jest.mock('../../containers/use_get_tags');

const onFilterChanged = jest.fn();
const fetchReporters = jest.fn();
const fetchTags = jest.fn();
const setFilterRefetch = jest.fn();

const props = {
  countClosedCases: 1234,
  countOpenCases: 99,
  countInProgressCases: 54,
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

  it('should render the case status filter dropdown', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-status-filter"]`).first().exists()).toBeTruthy();
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

  it('should call onFilterChange when changing status', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
    wrapper.find('button[data-test-subj="case-status-filter-closed"]').simulate('click');
    expect(onFilterChanged).toBeCalledWith({ status: CaseStatuses.closed });
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

  it('StatusFilterWrapper should have a fixed width of 180px', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="status-filter-wrapper"]').first()).toHaveStyleRule(
      'flex-basis',
      '180px',
      {
        modifier: '&&',
      }
    );
  });
});

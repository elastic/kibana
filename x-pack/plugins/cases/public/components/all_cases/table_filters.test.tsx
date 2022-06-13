/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../common/api';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { TestProviders } from '../../common/mock';
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
  availableSolutions: [],
};

describe('CasesTableFilters ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    wrapper.find(`[data-test-subj="options-filter-popover-item-coke"]`).last().simulate('click');

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

    wrapper
      .find(`[data-test-subj="options-filter-popover-item-casetester"]`)
      .last()
      .simulate('click');

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

  describe('dynamic Solution filter', () => {
    it('shows Solution filter when provided more than 1 availableSolutions', () => {
      const wrapper = mount(
        <TestProviders>
          <CasesTableFilters
            {...props}
            availableSolutions={[SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER]}
          />
        </TestProviders>
      );
      expect(
        wrapper.find(`[data-test-subj="options-filter-popover-button-Solution"]`).exists()
      ).toBeTruthy();
    });

    it('does not show Solution filter when provided less than 1 availableSolutions', () => {
      const wrapper = mount(
        <TestProviders>
          <CasesTableFilters {...props} availableSolutions={[OBSERVABILITY_OWNER]} />
        </TestProviders>
      );
      expect(
        wrapper.find(`[data-test-subj="options-filter-popover-button-Solution"]`).exists()
      ).toBeFalsy();
    });
  });

  it('should call onFilterChange when selected solution changes', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters
          {...props}
          availableSolutions={[SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER]}
        />
      </TestProviders>
    );
    wrapper
      .find(`[data-test-subj="options-filter-popover-button-Solution"]`)
      .last()
      .simulate('click');

    wrapper
      .find(`[data-test-subj="options-filter-popover-item-${SECURITY_SOLUTION_OWNER}"]`)
      .last()
      .simulate('click');

    expect(onFilterChanged).toBeCalledWith({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  describe('create case button', () => {
    it('should not render the create case button when displayCreateCaseButton and onCreateCasePressed are not passed', () => {
      const wrapper = mount(
        <TestProviders>
          <CasesTableFilters {...props} />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="cases-table-add-case-filter-bar"]`).length).toBe(0);
    });

    it('should render the create case button when displayCreateCaseButton and onCreateCasePressed are passed', () => {
      const onCreateCasePressed = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <CasesTableFilters
            {...props}
            displayCreateCaseButton={true}
            onCreateCasePressed={onCreateCasePressed}
          />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="cases-table-add-case-filter-bar"]`)).toBeTruthy();
    });

    it('should call the onCreateCasePressed when create case is clicked', () => {
      const onCreateCasePressed = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <CasesTableFilters
            {...props}
            displayCreateCaseButton={true}
            onCreateCasePressed={onCreateCasePressed}
          />
        </TestProviders>
      );
      wrapper.find(`[data-test-subj="cases-table-add-case-filter-bar"]`).first().simulate('click');
      wrapper.update();
      // NOTE: intentionally checking no arguments are passed
      expect(onCreateCasePressed).toHaveBeenCalledWith();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { CaseStatuses } from '../../../common/api';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, TestProviders } from '../../common/mock';
import { DEFAULT_FILTER_OPTIONS } from '../../containers/use_get_cases';
import { CasesTableFilters } from './table_filters';
import { useGetTags } from '../../containers/use_get_tags';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { userProfiles } from '../../containers/user_profiles/api.mock';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/user_profiles/use_suggest_user_profiles');

const onFilterChanged = jest.fn();
const refetch = jest.fn();
const setFilterRefetch = jest.fn();

const props = {
  countClosedCases: 1234,
  countOpenCases: 99,
  countInProgressCases: 54,
  onFilterChanged,
  initial: DEFAULT_FILTER_OPTIONS,
  setFilterRefetch,
  availableSolutions: [],
  isLoading: false,
  currentUserProfile: undefined,
};

describe('CasesTableFilters ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
    (useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], refetch });
    (useSuggestUserProfiles as jest.Mock).mockReturnValue({ data: userProfiles, isLoading: false });
  });

  it('should render the case status filter dropdown', () => {
    const wrapper = mount(
      <TestProviders>
        <CasesTableFilters {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-status-filter"]`).first().exists()).toBeTruthy();
  });

  it('should render the case severity filter dropdown', () => {
    const result = appMockRender.render(<CasesTableFilters {...props} />);
    expect(result.getByTestId('case-severity-filter')).toBeTruthy();
  });

  it('should call onFilterChange when the severity filter changes', async () => {
    const result = appMockRender.render(<CasesTableFilters {...props} />);
    userEvent.click(result.getByTestId('case-severity-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-severity-filter-high'));

    expect(onFilterChanged).toBeCalledWith({ severity: 'high' });
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

  it('should call onFilterChange when selected assignees change', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRender = createAppMockRenderer({ license });

    const { getByTestId, getByText } = appMockRender.render(<CasesTableFilters {...props} />);
    userEvent.click(getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    userEvent.click(getByText('Physical Dinosaur'));

    expect(onFilterChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
        ],
      }
    `);
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

  it('should remove assignee from selected assignees when assignee no longer exists', async () => {
    const overrideProps = {
      ...props,
      initial: {
        ...DEFAULT_FILTER_OPTIONS,
        assignees: [
          // invalid profile uid
          '123',
          'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        ],
      },
    };

    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRender = createAppMockRenderer({ license });

    appMockRender.render(<CasesTableFilters {...overrideProps} />);
    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByText('Physical Dinosaur'));

    expect(onFilterChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
        ],
      }
    `);
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

  describe('Solution filter', () => {
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

    it('should deselect all solutions', () => {
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

      wrapper
        .find(`[data-test-subj="options-filter-popover-item-${SECURITY_SOLUTION_OWNER}"]`)
        .last()
        .simulate('click');

      expect(onFilterChanged).toBeCalledWith({ owner: [] });
    });

    it('does not select a solution on initial render', () => {
      const wrapper = mount(
        <TestProviders>
          <CasesTableFilters
            {...props}
            availableSolutions={[SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER]}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="options-filter-popover-button-Solution"]`).first().props()
      ).toEqual(expect.objectContaining({ hasActiveFilters: false }));
    });
  });

  describe('assignees filter', () => {
    it('should hide the assignees filters on basic license', async () => {
      const result = appMockRender.render(<CasesTableFilters {...props} />);

      expect(result.queryByTestId('options-filter-popover-button-assignees')).toBeNull();
    });

    it('should show the assignees filters on platinum license', async () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });

      appMockRender = createAppMockRenderer({ license });
      const result = appMockRender.render(<CasesTableFilters {...props} />);

      expect(result.getByTestId('options-filter-popover-button-assignees')).toBeInTheDocument();
    });
  });
});

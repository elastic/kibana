/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { waitForComponentToUpdate } from '../../common/test_utils';

import { CaseStatuses } from '../../../common/types/domain';
import {
  OWNER_INFO,
  SECURITY_SOLUTION_OWNER,
  OBSERVABILITY_OWNER,
  MAX_TAGS_FILTER_LENGTH,
  MAX_CATEGORY_FILTER_LENGTH,
} from '../../../common/constants';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { DEFAULT_FILTER_OPTIONS } from '../../containers/use_get_cases';
import { CasesTableFilters } from './table_filters';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCategories } from '../../containers/use_get_categories';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { userProfiles } from '../../containers/user_profiles/api.mock';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_categories');
jest.mock('../../containers/user_profiles/use_suggest_user_profiles');

const onFilterChanged = jest.fn();
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
    (useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], isLoading: false });
    (useGetCategories as jest.Mock).mockReturnValue({
      data: ['twix', 'snickers'],
      isLoading: false,
    });
    (useSuggestUserProfiles as jest.Mock).mockReturnValue({ data: userProfiles, isLoading: false });
  });

  it('should render the case status filter dropdown', () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    expect(screen.getByTestId('case-status-filter')).toBeInTheDocument();
  });

  it('should render the case severity filter dropdown', () => {
    appMockRender.render(<CasesTableFilters {...props} />);
    expect(screen.getByTestId('case-severity-filter')).toBeTruthy();
  });

  it('should call onFilterChange when the severity filter changes', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);
    userEvent.click(screen.getByTestId('case-severity-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('case-severity-filter-high'));

    expect(onFilterChanged).toBeCalledWith({ severity: 'high' });
  });

  it('should call onFilterChange when selected tags change', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-Tags'));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('options-filter-popover-item-coke'));

    expect(onFilterChanged).toBeCalledWith({ tags: ['coke'] });
  });

  it('should call onFilterChange when selected category changes', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-Categories'));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('options-filter-popover-item-twix'));

    expect(onFilterChanged).toBeCalledWith({ category: ['twix'] });
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

  it('should call onFilterChange when search changes', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    await userEvent.type(screen.getByTestId('search-cases'), 'My search{enter}');

    expect(onFilterChanged).toBeCalledWith({ search: 'My search' });
  });

  it('should call onFilterChange when changing status', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    userEvent.click(screen.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('case-status-filter-closed'));

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

    appMockRender.render(<CasesTableFilters {...ourProps} />);
    expect(onFilterChanged).toHaveBeenCalledWith({ tags: ['pepsi'] });
  });

  it('should show warning message when maximum tags selected', async () => {
    const newTags = Array(MAX_TAGS_FILTER_LENGTH).fill('coke');
    (useGetTags as jest.Mock).mockReturnValue({ data: newTags, isLoading: false });

    const ourProps = {
      ...props,
      initial: {
        ...DEFAULT_FILTER_OPTIONS,
        tags: newTags,
      },
    };

    appMockRender.render(<CasesTableFilters {...ourProps} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('maximum-length-warning')).toBeInTheDocument();
  });

  it('should show warning message when tags selection reaches maximum limit', async () => {
    const newTags = Array(MAX_TAGS_FILTER_LENGTH - 1).fill('coke');
    const tags = [...newTags, 'pepsi'];
    (useGetTags as jest.Mock).mockReturnValue({ data: tags, isLoading: false });

    const ourProps = {
      ...props,
      initial: {
        ...DEFAULT_FILTER_OPTIONS,
        tags: newTags,
      },
    };

    appMockRender.render(<CasesTableFilters {...ourProps} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId(`options-filter-popover-item-${tags[tags.length - 1]}`));

    expect(screen.getByTestId('maximum-length-warning')).toBeInTheDocument();
  });

  it('should not show warning message when one of the tags deselected after reaching the limit', async () => {
    const newTags = Array(MAX_TAGS_FILTER_LENGTH).fill('coke');
    (useGetTags as jest.Mock).mockReturnValue({ data: newTags, isLoading: false });

    const ourProps = {
      ...props,
      initial: {
        ...DEFAULT_FILTER_OPTIONS,
        tags: newTags,
      },
    };

    appMockRender.render(<CasesTableFilters {...ourProps} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('maximum-length-warning')).toBeInTheDocument();

    userEvent.click(screen.getAllByTestId(`options-filter-popover-item-${newTags[0]}`)[0]);

    expect(screen.queryByTestId('maximum-length-warning')).not.toBeInTheDocument();
  });

  it('should show warning message when maximum categories selected', async () => {
    const newCategories = Array(MAX_CATEGORY_FILTER_LENGTH).fill('snickers');
    (useGetCategories as jest.Mock).mockReturnValue({ data: newCategories, isLoading: false });

    const ourProps = {
      ...props,
      initial: {
        ...DEFAULT_FILTER_OPTIONS,
        category: newCategories,
      },
    };

    appMockRender.render(<CasesTableFilters {...ourProps} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-Categories'));

    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('maximum-length-warning')).toBeInTheDocument();
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
    appMockRender.render(<CasesTableFilters {...props} />);

    expect(screen.getByTestId('status-filter-wrapper')).toHaveStyleRule('flex-basis', '180px', {
      modifier: '&&',
    });
  });

  describe('Solution filter', () => {
    const securitySolution = {
      id: SECURITY_SOLUTION_OWNER,
      label: OWNER_INFO[SECURITY_SOLUTION_OWNER].label,
      iconType: OWNER_INFO[SECURITY_SOLUTION_OWNER].iconType,
    };
    const observabilitySolution = {
      id: OBSERVABILITY_OWNER,
      label: OWNER_INFO[OBSERVABILITY_OWNER].label,
      iconType: OWNER_INFO[OBSERVABILITY_OWNER].iconType,
    };

    it('shows Solution filter when provided more than 1 availableSolutions', () => {
      appMockRender.render(
        <CasesTableFilters
          {...props}
          availableSolutions={[securitySolution, observabilitySolution]}
        />
      );
      expect(screen.getByTestId('solution-filter-popover-button')).toBeInTheDocument();
    });

    it('does not show Solution filter when provided less than 1 availableSolutions', () => {
      appMockRender.render(
        <CasesTableFilters {...props} availableSolutions={[observabilitySolution]} />
      );
      expect(screen.queryByTestId('solution-filter-popover-button')).not.toBeInTheDocument();
    });

    it('should call onFilterChange when selected solution changes', async () => {
      appMockRender.render(
        <CasesTableFilters
          {...props}
          availableSolutions={[securitySolution, observabilitySolution]}
        />
      );
      userEvent.click(screen.getByTestId('solution-filter-popover-button'));

      await waitForEuiPopoverOpen();

      userEvent.click(
        screen.getByTestId(`solution-filter-popover-item-${SECURITY_SOLUTION_OWNER}`)
      );

      expect(onFilterChanged).toBeCalledWith({ owner: [SECURITY_SOLUTION_OWNER] });
    });

    it('should deselect all solutions', async () => {
      appMockRender.render(
        <CasesTableFilters
          {...props}
          availableSolutions={[securitySolution, observabilitySolution]}
        />
      );

      userEvent.click(screen.getByTestId('solution-filter-popover-button'));

      await waitForEuiPopoverOpen();

      userEvent.click(
        screen.getByTestId(`solution-filter-popover-item-${SECURITY_SOLUTION_OWNER}`)
      );

      expect(onFilterChanged).toBeCalledWith({ owner: [SECURITY_SOLUTION_OWNER] });

      userEvent.click(
        screen.getByTestId(`solution-filter-popover-item-${SECURITY_SOLUTION_OWNER}`)
      );

      expect(onFilterChanged).toBeCalledWith({ owner: [] });
    });

    it('does not select a solution on initial render', () => {
      appMockRender.render(
        <CasesTableFilters
          {...props}
          availableSolutions={[securitySolution, observabilitySolution]}
        />
      );

      expect(screen.getByTestId('solution-filter-popover-button')).not.toHaveAttribute(
        'hasActiveFilters'
      );
    });
  });

  describe('assignees filter', () => {
    it('should hide the assignees filters on basic license', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      expect(screen.queryByTestId('options-filter-popover-button-assignees')).toBeNull();
    });

    it('should show the assignees filters on platinum license', async () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });

      appMockRender = createAppMockRenderer({ license });
      appMockRender.render(<CasesTableFilters {...props} />);

      expect(screen.getByTestId('options-filter-popover-button-assignees')).toBeInTheDocument();
    });
  });

  describe('create case button', () => {
    it('should not render the create case button when isSelectorView is false and onCreateCasePressed are not passed', () => {
      appMockRender.render(<CasesTableFilters {...props} />);
      expect(screen.queryByTestId('cases-table-add-case-filter-bar')).not.toBeInTheDocument();
    });

    it('should render the create case button when isSelectorView is true and onCreateCasePressed are passed', () => {
      const onCreateCasePressed = jest.fn();
      appMockRender.render(
        <CasesTableFilters
          {...props}
          isSelectorView={true}
          onCreateCasePressed={onCreateCasePressed}
        />
      );
      expect(screen.getByTestId('cases-table-add-case-filter-bar')).toBeInTheDocument();
    });

    it('should call the onCreateCasePressed when create case is clicked', async () => {
      const onCreateCasePressed = jest.fn();
      appMockRender.render(
        <CasesTableFilters
          {...props}
          isSelectorView={true}
          onCreateCasePressed={onCreateCasePressed}
        />
      );

      userEvent.click(screen.getByTestId('cases-table-add-case-filter-bar'));

      await waitForComponentToUpdate();
      // NOTE: intentionally checking no arguments are passed
      expect(onCreateCasePressed).toHaveBeenCalledWith();
    });
  });
});

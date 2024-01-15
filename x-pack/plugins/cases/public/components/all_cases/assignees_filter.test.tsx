/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import type { AssigneesFilterPopoverProps } from './assignees_filter';
import { AssigneesFilterPopover } from './assignees_filter';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { MAX_ASSIGNEES_FILTER_LENGTH } from '../../../common/constants';

jest.mock('../../containers/user_profiles/api');

// FLAKY: https://github.com/elastic/kibana/issues/174520
describe.skip('AssigneesFilterPopover', () => {
  let appMockRender: AppMockRenderer;
  let defaultProps: AssigneesFilterPopoverProps;

  beforeEach(() => {
    jest.clearAllMocks();

    appMockRender = createAppMockRenderer();

    defaultProps = {
      currentUserProfile: undefined,
      selectedAssignees: [],
      isLoading: false,
      onSelectionChange: jest.fn(),
    };
  });

  it('calls onSelectionChange when 1 user is selected', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByPlaceholderText('Search users')).toBeInTheDocument();
    });
    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });
    userEvent.click(screen.getByText('WD'));

    expect(onSelectionChange.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "filterId": "assignees",
        "selectedOptionKeys": Array [
          "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
        ],
      }
    `);
  });

  it('calls onSelectionChange with a single user when different users are selected', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('wet_dingo@elastic.co'));
    });

    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });
    userEvent.click(screen.getByText('WD'));
    userEvent.click(screen.getByText('damaged_raccoon@elastic.co'));

    expect(onSelectionChange.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "filterId": "assignees",
        "selectedOptionKeys": Array [
          "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
        ],
      }
    `);
    expect(onSelectionChange.mock.calls[1][0]).toMatchInlineSnapshot(`
      Object {
        "filterId": "assignees",
        "selectedOptionKeys": Array [
          "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
        ],
      }
    `);
  });

  it('does not show the assigned users total if there are no assigned users', async () => {
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    });

    await waitForEuiPopoverOpen();

    expect(screen.queryByText('assignee')).not.toBeInTheDocument();
  });

  it('shows the 1 assigned total when the users are passed in', async () => {
    const props = {
      ...defaultProps,
      selectedAssignees: [userProfiles[0].uid],
    };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(async () => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('1 filter selected')).toBeInTheDocument();
    });

    await waitForEuiPopoverOpen();

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('shows the total when the multiple users are selected', async () => {
    const props = {
      ...defaultProps,
      selectedAssignees: [userProfiles[0].uid, userProfiles[1].uid],
    };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(async () => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('2 filters selected')).toBeInTheDocument();
    });

    await waitForEuiPopoverOpen();

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
  });

  it('shows three users when initially rendered', async () => {
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('Wet Dingo')).toBeInTheDocument();
    });
    await waitForEuiPopoverOpen();

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
  });

  it('shows the users sorted alphabetically with the current user at the front', async () => {
    const props = {
      ...defaultProps,
      currentUserProfile: userProfiles[2],
    };

    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('Wet Dingo')).toBeInTheDocument();
    });
    await waitForEuiPopoverOpen();

    const assignees = screen.getAllByRole('option');
    expect(within(assignees[1]).getByText('Wet Dingo')).toBeInTheDocument();
    expect(within(assignees[2]).getByText('Convenient Orca')).toBeInTheDocument();
    expect(within(assignees[3]).getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(within(assignees[4]).getByText('Physical Dinosaur')).toBeInTheDocument();
    expect(within(assignees[5]).getByText('Silly Hare')).toBeInTheDocument();
  });

  it('does not show the number of filters', async () => {
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('Wet Dingo')).toBeInTheDocument();
    });
    await waitForEuiPopoverOpen();

    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('show the no assignee filter option', async () => {
    const props = {
      ...defaultProps,
      currentUserProfile: userProfiles[2],
    };

    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('Wet Dingo')).toBeInTheDocument();
    });

    await waitForEuiPopoverOpen();

    expect(screen.getByText('No assignees')).toBeInTheDocument();
  });

  it('filters cases with no assignees', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByPlaceholderText('Search users')).toBeInTheDocument();
    });
    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByText('No assignees'));

    expect(onSelectionChange.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "filterId": "assignees",
        "selectedOptionKeys": Array [
          null,
        ],
      }
    `);
  });

  it('filters cases with no assignees and users', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByPlaceholderText('Search users')).toBeInTheDocument();
    });
    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByText('No assignees'));
    userEvent.click(screen.getByText('WD'));
    userEvent.click(screen.getByText('damaged_raccoon@elastic.co'));

    expect(onSelectionChange.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "filterId": "assignees",
        "selectedOptionKeys": Array [
          null,
        ],
      }
    `);

    expect(onSelectionChange.mock.calls[1][0]).toMatchInlineSnapshot(`
      Object {
        "filterId": "assignees",
        "selectedOptionKeys": Array [
          "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
        ],
      }
    `);

    expect(onSelectionChange.mock.calls[2][0]).toMatchInlineSnapshot(`
      Object {
        "filterId": "assignees",
        "selectedOptionKeys": Array [
          "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
        ],
      }
    `);
  });

  it('hides no assignee filtering when searching', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(() => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByPlaceholderText('Search users')).toBeInTheDocument();
    });
    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });
    expect(screen.queryByText('No assignees')).not.toBeInTheDocument();
  });

  it('shows warning message when reaching maximum limit to filter', async () => {
    const maxAssignees = Array(MAX_ASSIGNEES_FILTER_LENGTH).fill(userProfiles[0].uid);
    const props = {
      ...defaultProps,
      selectedAssignees: maxAssignees,
    };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(async () => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(
        screen.getByText(`${MAX_ASSIGNEES_FILTER_LENGTH} filters selected`)
      ).toBeInTheDocument();
    });

    await waitForEuiPopoverOpen();

    expect(
      screen.getByText(
        `You've selected the maximum number of ${MAX_ASSIGNEES_FILTER_LENGTH} assignees`
      )
    ).toBeInTheDocument();

    expect(screen.getByTitle('No assignees')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTitle('No assignees')).toHaveAttribute('aria-disabled', 'true');
  });
});

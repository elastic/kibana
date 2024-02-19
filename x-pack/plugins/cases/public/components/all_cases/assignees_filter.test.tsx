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
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';

jest.mock('../../containers/user_profiles/use_suggest_user_profiles');

const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;

describe('AssigneesFilterPopover', () => {
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
    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });
  });

  it('calls onSelectionChange when 1 user is selected', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };

    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));

    await waitForEuiPopoverOpen();

    fireEvent.change(await screen.findByPlaceholderText('Search users'), {
      target: { value: 'dingo' },
    });
    userEvent.click(await screen.findByText('WD'), undefined, { skipPointerEventsCheck: true });

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({
        filterId: 'assignees',
        selectedOptionKeys: ['u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0'],
      });
    });
  });

  it('calls onSelectionChange with a single user when different users are selected', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByText('wet_dingo@elastic.co'));

    await waitForEuiPopoverOpen();

    fireEvent.change(await screen.findByPlaceholderText('Search users'), {
      target: { value: 'dingo' },
    });
    userEvent.click(await screen.findByText('WD'));
    userEvent.click(await screen.findByText('damaged_raccoon@elastic.co'));

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({
        filterId: 'assignees',
        selectedOptionKeys: ['u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0'],
      });
      expect(onSelectionChange).toHaveBeenCalledWith({
        filterId: 'assignees',
        selectedOptionKeys: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
      });
    });
  });

  it('does not show the assigned users total if there are no assigned users', async () => {
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByText('Damaged Raccoon')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    expect(screen.queryByText('assignee')).not.toBeInTheDocument();
  });

  it('shows the 1 assigned total when the users are passed in', async () => {
    const props = {
      ...defaultProps,
      selectedAssignees: [userProfiles[0].uid],
    };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByText('1 filter selected')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    expect(await screen.findByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('shows the total when the multiple users are selected', async () => {
    const props = {
      ...defaultProps,
      selectedAssignees: [userProfiles[0].uid, userProfiles[1].uid],
    };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByText('2 filters selected')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    expect(await screen.findByText('Damaged Raccoon')).toBeInTheDocument();
    expect(await screen.findByText('Physical Dinosaur')).toBeInTheDocument();
  });

  it('shows three users when initially rendered', async () => {
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByText('Wet Dingo')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    expect(await screen.findByText('Damaged Raccoon')).toBeInTheDocument();
    expect(await screen.findByText('Physical Dinosaur')).toBeInTheDocument();
  });

  it('shows the users sorted alphabetically with the current user at the front', async () => {
    const props = {
      ...defaultProps,
      currentUserProfile: userProfiles[2],
    };

    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByText('Wet Dingo')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    const assignees = await screen.findAllByRole('option');

    expect(await within(assignees[1]).findByText('Wet Dingo')).toBeInTheDocument();
    expect(await within(assignees[2]).findByText('Damaged Raccoon')).toBeInTheDocument();
    expect(await within(assignees[3]).findByText('Physical Dinosaur')).toBeInTheDocument();
  });

  it('does not show the number of filters', async () => {
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByText('Wet Dingo')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('show the no assignee filter option', async () => {
    const props = {
      ...defaultProps,
      currentUserProfile: userProfiles[2],
    };

    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByText('Wet Dingo')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    expect(await screen.findByText('No assignees')).toBeInTheDocument();
  });

  it('filters cases with no assignees', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByPlaceholderText('Search users')).toBeInTheDocument();
    await waitForEuiPopoverOpen();

    userEvent.click(await screen.findByText('No assignees'));

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({
        filterId: 'assignees',
        selectedOptionKeys: [null],
      });
    });
  });

  it('filters cases with no assignees and users', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByPlaceholderText('Search users')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    userEvent.click(await screen.findByText('No assignees'));
    userEvent.click(await screen.findByText('WD'));
    userEvent.click(await screen.findByText('damaged_raccoon@elastic.co'));

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({
        filterId: 'assignees',
        selectedOptionKeys: [null],
      });
      expect(onSelectionChange).toHaveBeenCalledWith({
        filterId: 'assignees',
        selectedOptionKeys: ['u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0'],
      });
      expect(onSelectionChange).toHaveBeenCalledWith({
        filterId: 'assignees',
        selectedOptionKeys: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
      });
    });
  });

  it('hides no assignee filtering when searching', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(await screen.findByPlaceholderText('Search users')).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    fireEvent.change(await screen.findByPlaceholderText('Search users'), {
      target: { value: 'dingo' },
    });
    expect(screen.queryByText('No assignees')).not.toBeInTheDocument();
  });

  it('shows warning message when reaching maximum limit to filter', async () => {
    const maxAssignees = Array(MAX_ASSIGNEES_FILTER_LENGTH).fill(userProfiles[0].uid);
    const props = {
      ...defaultProps,
      selectedAssignees: maxAssignees,
    };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(await screen.findByTestId('options-filter-popover-button-assignees'));
    expect(
      await screen.findByText(`${MAX_ASSIGNEES_FILTER_LENGTH} filters selected`)
    ).toBeInTheDocument();

    await waitForEuiPopoverOpen();

    expect(
      await screen.findByText(
        `You've selected the maximum number of ${MAX_ASSIGNEES_FILTER_LENGTH} assignees`
      )
    ).toBeInTheDocument();
    expect(await screen.findByTitle('No assignees')).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByTitle('No assignees')).toHaveAttribute('aria-disabled', 'true');
  });
});

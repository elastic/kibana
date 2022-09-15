/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { AssigneesFilterPopover, AssigneesFilterPopoverProps } from './assignees_filter';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('../../containers/user_profiles/api');

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
          Array [
            Object {
              "data": Object {},
              "enabled": true,
              "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
              "user": Object {
                "email": "wet_dingo@elastic.co",
                "full_name": "Wet Dingo",
                "username": "wet_dingo",
              },
            },
          ]
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
      Array [
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
          "user": Object {
            "email": "wet_dingo@elastic.co",
            "full_name": "Wet Dingo",
            "username": "wet_dingo",
          },
        },
      ]
    `);
    expect(onSelectionChange.mock.calls[1][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
          "user": Object {
            "email": "damaged_raccoon@elastic.co",
            "full_name": "Damaged Raccoon",
            "username": "damaged_raccoon",
          },
        },
      ]
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
      selectedAssignees: [userProfiles[0]],
    };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    await waitFor(async () => {
      userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
      expect(screen.getByText('1 assignee filtered')).toBeInTheDocument();
    });

    await waitForEuiPopoverOpen();

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
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
    expect(within(assignees[0]).getByText('Wet Dingo')).toBeInTheDocument();
    expect(within(assignees[1]).getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(within(assignees[2]).getByText('Physical Dinosaur')).toBeInTheDocument();
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
});

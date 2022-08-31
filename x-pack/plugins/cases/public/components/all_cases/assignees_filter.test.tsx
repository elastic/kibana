/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent } from '@testing-library/react';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { AssigneesFilterPopover, AssigneesFilterPopoverProps } from './assignees_filter';
import { useFindAssignees } from '../../containers/use_find_assignees';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('../../containers/use_find_assignees');

const useFindAssigneesMock = useFindAssignees as jest.Mock;

describe('AssigneesFilterPopover', () => {
  let appMockRender: AppMockRenderer;
  let defaultProps: AssigneesFilterPopoverProps;
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useFindAssigneesMock.mockReturnValue({
      data: userProfiles,
      isLoading: false,
      refetch,
    });

    appMockRender = createAppMockRenderer();

    defaultProps = {
      selectedAssignees: [],
      isLoading: false,
      onSelectionChange: jest.fn(),
      setFetchAssignees: jest.fn(),
    };
  });

  it('calls onSelectionChange when 1 user is selected', async () => {
    const onSelectionChange = jest.fn();
    const props = { ...defaultProps, onSelectionChange };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });
    userEvent.click(screen.getByText('wet_dingo@elastic.co'));

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

    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });
    userEvent.click(screen.getByText('wet_dingo@elastic.co'));
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

    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    expect(screen.queryByText('assignee')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });
    userEvent.click(screen.getByText('wet_dingo@elastic.co'));
  });

  it('shows the 1 assigned total when the users are passed in', async () => {
    const props = {
      ...defaultProps,
      selectedAssignees: [userProfiles[0]],
    };
    appMockRender.render(<AssigneesFilterPopover {...props} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    expect(screen.getByText('1 assignee filtered')).toBeInTheDocument();
    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('shows three users when initially rendered', async () => {
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
    expect(screen.getByText('Wet Dingo')).toBeInTheDocument();
  });

  it('shows the empty message when no users are returned by the hook initially', async () => {
    useFindAssigneesMock.mockReturnValue({ data: [], isLoading: false });
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    expect(
      screen.queryByTestId('case-user-profiles-assignees-popover-no-matches')
    ).not.toBeInTheDocument();
  });

  it('shows the no matches component', async () => {
    useFindAssigneesMock.mockReturnValue({ data: [], isLoading: false });
    appMockRender.render(<AssigneesFilterPopover {...defaultProps} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'bananas' } });

    expect(
      screen.getAllByTestId('case-user-profiles-assignees-popover-no-matches')[0]
    ).toBeInTheDocument();
  });
});

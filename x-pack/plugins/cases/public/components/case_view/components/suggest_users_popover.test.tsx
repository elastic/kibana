/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import type { SuggestUsersPopoverProps } from './suggest_users_popover';
import { SuggestUsersPopover } from './suggest_users_popover';
import { userProfiles } from '../../../containers/user_profiles/api.mock';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { AssigneeWithProfile } from '../../user_profiles/types';

jest.mock('../../../containers/user_profiles/api');

describe('SuggestUsersPopover', () => {
  let appMockRender: AppMockRenderer;
  let defaultProps: SuggestUsersPopoverProps;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();

    defaultProps = {
      isLoading: false,
      assignedUsersWithProfiles: [],
      isPopoverOpen: true,
      onUsersChange: jest.fn(),
      togglePopover: jest.fn(),
      onClosePopover: jest.fn(),
      currentUserProfile: undefined,
    };
  });

  it('calls onUsersChange when 1 user is selected', async () => {
    const onUsersChange = jest.fn();
    const props = { ...defaultProps, onUsersChange };
    appMockRender.render(<SuggestUsersPopover {...props} />);

    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });

    await waitFor(() => {
      expect(screen.getByText('WD')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('WD'));

    expect(onUsersChange.mock.calls[0][0]).toMatchInlineSnapshot(`
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

  it('calls onUsersChange when multiple users are selected', async () => {
    const onUsersChange = jest.fn();
    const props = { ...defaultProps, onUsersChange };
    appMockRender.render(<SuggestUsersPopover {...props} />);

    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'elastic' } });

    await waitFor(() => {
      expect(screen.getByText('WD')).toBeInTheDocument();
      expect(screen.getByText('DR')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('WD'));
    fireEvent.click(screen.getByText('DR'));

    expect(onUsersChange.mock.calls[1][0]).toMatchInlineSnapshot(`
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

  it('calls onUsersChange with the current user (Physical Dinosaur) at the beginning', async () => {
    const onUsersChange = jest.fn();
    const props = {
      ...defaultProps,
      assignedUsersWithProfiles: [asAssignee(userProfiles[1]), asAssignee(userProfiles[0])],
      currentUserProfile: userProfiles[1],
      onUsersChange,
    };
    appMockRender.render(<SuggestUsersPopover {...props} />);

    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'elastic' } });

    await waitFor(() => {
      expect(screen.getByText('WD')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('WD'));

    expect(onUsersChange.mock.calls[0][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
          "user": Object {
            "email": "physical_dinosaur@elastic.co",
            "full_name": "Physical Dinosaur",
            "username": "physical_dinosaur",
          },
        },
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

  it('does not show the assigned users total if there are no assigned users', async () => {
    appMockRender.render(<SuggestUsersPopover {...defaultProps} />);

    await waitForEuiPopoverOpen();

    expect(screen.queryByText('assigned')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });

    await waitFor(() => {
      expect(screen.getByText('WD')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('WD'));
    expect(screen.getByText('1 assigned')).toBeInTheDocument();
  });

  it('shows the 1 assigned total after clicking on a user', async () => {
    appMockRender.render(<SuggestUsersPopover {...defaultProps} />);

    await waitForEuiPopoverOpen();

    expect(screen.queryByText('assigned')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search users'), { target: { value: 'dingo' } });
    fireEvent.click(screen.getByText('WD'));
    expect(screen.getByText('1 assigned')).toBeInTheDocument();
  });

  it('shows the 1 assigned total when the users are passed in', async () => {
    const props = {
      ...defaultProps,
      assignedUsersWithProfiles: [{ uid: userProfiles[0].uid, profile: userProfiles[0] }],
    };
    appMockRender.render(<SuggestUsersPopover {...props} />);

    await waitForEuiPopoverOpen();

    expect(screen.getByText('1 assigned')).toBeInTheDocument();
    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('calls onTogglePopover when clicking the edit button after the popover is already open', async () => {
    const togglePopover = jest.fn();
    const props = {
      ...defaultProps,
      togglePopover,
    };
    appMockRender.render(<SuggestUsersPopover {...props} />);

    await waitForEuiPopoverOpen();

    await waitFor(() => {
      expect(screen.getByTestId('case-view-assignees-edit-button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));

    expect(togglePopover).toBeCalled();
  });

  it('shows results initially', async () => {
    appMockRender.render(<SuggestUsersPopover {...defaultProps} />);

    await waitForEuiPopoverOpen();

    await waitFor(() => expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument());
  });
});

const asAssignee = (profile: UserProfileWithAvatar): AssigneeWithProfile => ({
  uid: profile.uid,
  profile,
});

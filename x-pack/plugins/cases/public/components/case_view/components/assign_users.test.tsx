/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles, userProfilesMap } from '../../../containers/user_profiles/api.mock';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import {
  AppMockRenderer,
  createAppMockRenderer,
  noUpdateCasesPermissions,
} from '../../../common/mock';
import { AssignUsers, AssignUsersProps } from './assign_users';

jest.mock('../../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../../containers/user_profiles/use_get_current_user_profile');

const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

const currentUserProfile = userProfiles[0];

describe('AssignUsers', () => {
  let appMockRender: AppMockRenderer;
  let defaultProps: AssignUsersProps;

  beforeEach(() => {
    defaultProps = {
      assignees: [],
      currentUserProfile,
      userProfiles: new Map(),
      onAssigneesChanged: jest.fn(),
      isLoading: false,
    };

    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });
    useGetCurrentUserProfileMock.mockReturnValue({ data: currentUserProfile, isLoading: false });

    appMockRender = createAppMockRenderer();
  });

  it('does not show any assignees when there are none assigned', () => {
    appMockRender.render(<AssignUsers {...defaultProps} />);

    expect(screen.getByText('No users have been assigned.')).toBeInTheDocument();
  });

  it('does not show the suggest users edit button when the user does not have update permissions', () => {
    appMockRender = createAppMockRenderer({ permissions: noUpdateCasesPermissions() });
    appMockRender.render(<AssignUsers {...defaultProps} />);

    expect(screen.queryByTestId('case-view-assignees-edit')).not.toBeInTheDocument();
  });

  it('does not show the suggest users edit button when the component is still loading', () => {
    appMockRender.render(<AssignUsers {...{ ...defaultProps, isLoading: true }} />);

    expect(screen.queryByTestId('case-view-assignees-edit')).not.toBeInTheDocument();
    expect(screen.getByTestId('case-view-assignees-button-loading')).toBeInTheDocument();
  });

  it('does not show the assign yourself link when the current profile is undefined', () => {
    appMockRender.render(<AssignUsers {...{ ...defaultProps, currentUserProfile: undefined }} />);

    expect(screen.queryByText('assign yourself')).not.toBeInTheDocument();
    expect(screen.getByText('Assign a user')).toBeInTheDocument();
  });

  it('shows the suggest users edit button when the user has update permissions', () => {
    appMockRender.render(<AssignUsers {...defaultProps} />);

    expect(screen.getByTestId('case-view-assignees-edit')).toBeInTheDocument();
  });

  it('shows the two initially assigned users', () => {
    const props = {
      ...defaultProps,
      assignees: userProfiles.slice(0, 2),
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
    expect(screen.queryByText('Wet Dingo')).not.toBeInTheDocument();
    expect(screen.queryByText('No users have been assigned.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-assignees-loading')).not.toBeInTheDocument();
  });

  it('shows the rerendered assignees', () => {
    const { rerender } = appMockRender.render(<AssignUsers {...defaultProps} />);

    const props = {
      ...defaultProps,
      assignees: userProfiles.slice(0, 2),
      userProfiles: userProfilesMap,
    };
    rerender(<AssignUsers {...props} />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
    expect(screen.queryByText('Wet Dingo')).not.toBeInTheDocument();
    expect(screen.queryByText('No users have been assigned.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-assignees-loading')).not.toBeInTheDocument();
  });

  it('shows the popover when the pencil is clicked', () => {
    const props = {
      ...defaultProps,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('shows the popover when the assign a user link is clicked', () => {
    const props = {
      ...defaultProps,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByText('Assign a user'));

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('assigns the current user when the assign yourself link is clicked', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByText('assign yourself'));

    // the first call will be when the component is initially render with isPopover as false
    // and then it should call again when the user is assigned
    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(2));

    expect(onAssigneesChanged.mock.calls[1][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
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

  it('calls onAssigneesChanged with the deleted user', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      assignees: [{ uid: userProfiles[0].uid }],
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.mouseEnter(
      screen.getByTestId(`user-profile-assigned-user-group-${userProfiles[0].user.username}`)
    );
    fireEvent.click(
      screen.getByTestId(`user-profile-assigned-user-cross-${userProfiles[0].user.username}`)
    );

    // the first call will be when the component is initially render with isPopover as false
    // and then it should call again when the user is assigned
    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(2));

    expect(onAssigneesChanged.mock.calls[1][0]).toMatchInlineSnapshot(`Array []`);
  });

  it('calls onAssigneesChanged when the popover is closed', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));

    fireEvent.click(screen.getByText('Damaged Raccoon'));

    // close the popover
    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));

    // the first call will be when the component is initially render with isPopover as false
    // and then it should call again when the user is assigned
    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(2));

    expect(onAssigneesChanged.mock.calls[1][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
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
});

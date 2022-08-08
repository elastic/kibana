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
import { AssignUsers } from './assign_users';

jest.mock('../../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../../containers/user_profiles/use_get_current_user_profile');

const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

describe('AssignUsers', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });
    useGetCurrentUserProfileMock.mockReturnValue({ data: userProfiles[0], isLoading: false });
    appMockRender = createAppMockRenderer();
  });

  it('does not show any assignees when there are no assigned', () => {
    const props = {
      assignees: [],
      userProfiles: new Map(),
      onAssigneesChanged: jest.fn(),
      isLoading: false,
    };
    appMockRender.render(<AssignUsers {...props} />);

    expect(screen.getByText('No users have been assigned.')).toBeInTheDocument();
  });

  it('does not show the suggest users edit button when the user does not have update permissions', () => {
    const props = {
      assignees: [],
      userProfiles: new Map(),
      onAssigneesChanged: jest.fn(),
      isLoading: false,
    };
    appMockRender = createAppMockRenderer({ permissions: noUpdateCasesPermissions() });
    appMockRender.render(<AssignUsers {...props} />);

    expect(screen.queryByTestId('case-view-assignees-edit')).not.toBeInTheDocument();
  });

  it('does not show the suggest users edit button when the component is still loading', () => {
    const props = {
      assignees: [],
      userProfiles: new Map(),
      onAssigneesChanged: jest.fn(),
      isLoading: true,
    };
    appMockRender.render(<AssignUsers {...props} />);

    expect(screen.queryByTestId('case-view-assignees-edit')).not.toBeInTheDocument();
  });

  it('shows the suggest users edit button when the user has update permissions', () => {
    const props = {
      assignees: [],
      userProfiles: new Map(),
      onAssigneesChanged: jest.fn(),
      isLoading: false,
    };
    appMockRender.render(<AssignUsers {...props} />);

    expect(screen.queryByTestId('case-view-assignees-edit')).toBeInTheDocument();
  });

  it('shows the two assigned users', () => {
    const props = {
      assignees: userProfiles.slice(0, 2),
      userProfiles: userProfilesMap,
      onAssigneesChanged: jest.fn(),
      isLoading: false,
    };
    appMockRender.render(<AssignUsers {...props} />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
    expect(screen.queryByText('Wet Dingo')).not.toBeInTheDocument();
    expect(screen.queryByText('No users have been assigned.')).not.toBeInTheDocument();
  });

  it.skip('calls onAssigneesChanged when a user is assigned', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      assignees: [],
      userProfiles: userProfilesMap,
      onAssigneesChanged,
      isLoading: false,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    fireEvent.click(screen.getByText('Wet Dingo'));
    // close popover
    // fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    // userEvent.keyboard('{Escape}');

    // TODO: can't close the popover
    fireEvent.keyDown(screen.getByTestId('case-view-assignees-edit-button'), {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      charCode: 27,
    });
    await waitFor(() => expect(screen.queryByText('Wet Dingo')).not.toBeInTheDocument());

    // screen.debug();
    await waitFor(() =>
      expect(onAssigneesChanged.mock.calls[0]).toMatchInlineSnapshot(`undefined`)
    );
  });
});

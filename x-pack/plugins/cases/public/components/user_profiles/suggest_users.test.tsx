/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { SuggestUsers } from './suggest_users';
import { userProfiles } from '../../containers/user_profiles/api.mock';

jest.mock('../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../containers/user_profiles/use_get_current_user_profile');

const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

describe('SuggestUsers', () => {
  beforeEach(() => {
    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });
    useGetCurrentUserProfileMock.mockReturnValue({ data: userProfiles[0], isLoading: false });
  });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('calls onUsersChange when users are selected', () => {
    const onUsersChange = jest.fn();
    const props = {
      onUsersChange,
      selectedUsers: [],
    };

    appMockRender.render(<SuggestUsers {...props} />);

    fireEvent.click(screen.getByText('Wet Dingo'));

    expect(onUsersChange.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "data": Object {},
            "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
            "user": Object {
              "email": "wet_dingo@elastic.co",
              "full_name": "Wet Dingo",
              "username": "wet_dingo",
            },
          },
        ],
      ]
    `);
  });
});

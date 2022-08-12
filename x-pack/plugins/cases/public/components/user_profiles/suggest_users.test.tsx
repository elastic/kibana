/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { SuggestUsers } from './suggest_users';
import { userProfiles } from '../../containers/user_profiles/api.mock';

jest.mock('../../containers/user_profiles/use_suggest_user_profiles');

const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;

const currentUserProfile = userProfiles[0];

describe('SuggestUsers', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });

    appMockRender = createAppMockRenderer();
  });

  it('calls onUsersChange when users are selected', () => {
    const onUsersChange = jest.fn();
    const props = {
      onUsersChange,
      currentUserProfile,
      isLoading: false,
      selectedUsers: [],
    };

    appMockRender.render(<SuggestUsers {...props} />);

    fireEvent.click(screen.getByText('Wet Dingo'));

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
});

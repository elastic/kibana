/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ElasticUser } from '../../containers/types';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { HoverableUsernameResolver } from './hoverable_username_resolver';

describe('HoverableUsernameResolver', () => {
  it('renders the full name using the elastic user information when the profile is not present', async () => {
    const user: ElasticUser = {
      username: 'user',
      email: 'some.user@google.com',
      fullName: 'Some Super User',
    };

    render(<HoverableUsernameResolver user={user} />);

    expect(screen.getByText('Some Super User')).toBeInTheDocument();
  });

  it('renders the username when the profile uid is not found', async () => {
    const user: ElasticUser = {
      username: 'some_user',
      profileUid: '123',
      fullName: null,
      email: null,
    };

    render(<HoverableUsernameResolver user={user} />);

    expect(screen.getByText('some_user')).toBeInTheDocument();
  });

  it('renders the full name using the profile', async () => {
    const user: ElasticUser = {
      username: userProfiles[0].user.username,
      profileUid: userProfiles[0].uid,
      fullName: null,
      email: null,
    };

    render(<HoverableUsernameResolver user={user} userProfiles={userProfilesMap} />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('renders the full name bolded by default', async () => {
    const user: ElasticUser = {
      username: userProfiles[0].user.username,
      profileUid: userProfiles[0].uid,
      fullName: null,
      email: null,
    };

    render(<HoverableUsernameResolver user={user} userProfiles={userProfilesMap} />);

    expect(screen.getByTestId('user-profile-username-bolded')).toBeInTheDocument();
    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });
});

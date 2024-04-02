/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UserToolTip } from './user_tooltip';

describe('UserToolTip', () => {
  it('renders the tooltip when hovering', async () => {
    const profile: UserProfileWithAvatar = {
      uid: '1',
      enabled: true,
      data: {
        avatar: {
          initials: 'SU',
        },
      },
      user: {
        username: 'user',
        email: 'some.user@google.com',
        full_name: 'Some Super User',
      },
    };

    render(
      <UserToolTip userInfo={profile}>
        <strong>{'case user'}</strong>
      </UserToolTip>
    );

    userEvent.hover(await screen.findByText('case user'));

    expect(await screen.findByTestId('user-profile-tooltip')).toBeInTheDocument();
    expect(await screen.findByText('Some Super User')).toBeInTheDocument();
    expect(await screen.findByText('some.user@google.com')).toBeInTheDocument();
    expect(await screen.findByText('SU')).toBeInTheDocument();
  });

  it('only shows the display name if full name is missing', async () => {
    const profile: UserProfileWithAvatar = {
      uid: '1',
      enabled: true,
      data: {
        avatar: {
          initials: 'SU',
        },
      },
      user: {
        username: 'user',
        email: 'some.user@google.com',
      },
    };

    render(
      <UserToolTip userInfo={profile}>
        <strong>{'case user'}</strong>
      </UserToolTip>
    );

    userEvent.hover(await screen.findByText('case user'));

    expect(await screen.findByTestId('user-profile-tooltip')).toBeInTheDocument();

    expect(await screen.findByText('some.user@google.com')).toBeInTheDocument();
    expect(await screen.findByText('SU')).toBeInTheDocument();
    expect(screen.queryByText('Some Super User')).not.toBeInTheDocument();
  });

  it('only shows the full name if display name is missing', async () => {
    const profile: UserProfileWithAvatar = {
      uid: '1',
      enabled: true,
      data: {
        avatar: {
          initials: 'SU',
        },
      },
      user: {
        username: 'user',
        full_name: 'Some Super User',
        email: 'some.user@google.com',
      },
    };

    render(
      <UserToolTip userInfo={profile}>
        <strong>{'case user'}</strong>
      </UserToolTip>
    );

    userEvent.hover(await screen.findByText('case user'));

    expect(await screen.findByTestId('user-profile-tooltip')).toBeInTheDocument();
    expect(await screen.findByText('Some Super User')).toBeInTheDocument();
    expect(await screen.findByText('some.user@google.com')).toBeInTheDocument();
    expect(await screen.findByText('SU')).toBeInTheDocument();
  });

  it('only shows the email once when display name and full name are not defined', async () => {
    const profile: UserProfileWithAvatar = {
      uid: '1',
      enabled: true,
      data: {
        avatar: {
          initials: 'SU',
        },
      },
      user: {
        username: 'user',
        email: 'some.user@google.com',
      },
    };

    render(
      <UserToolTip userInfo={profile}>
        <strong>{'case user'}</strong>
      </UserToolTip>
    );

    userEvent.hover(await screen.findByText('case user'));

    expect(await screen.findByTestId('user-profile-tooltip')).toBeInTheDocument();
    expect(await screen.findByText('some.user@google.com')).toBeInTheDocument();
    expect(await screen.findByText('SU')).toBeInTheDocument();
    expect(screen.queryByText('Some Super User')).not.toBeInTheDocument();
  });

  it('only shows the username once when all other fields are undefined', async () => {
    const profile: UserProfileWithAvatar = {
      uid: '1',
      enabled: true,
      data: {
        avatar: {
          initials: 'SU',
        },
      },
      user: {
        username: 'user',
      },
    };

    render(
      <UserToolTip userInfo={profile}>
        <strong>{'case user'}</strong>
      </UserToolTip>
    );

    userEvent.hover(await screen.findByText('case user'));

    expect(await screen.findByTestId('user-profile-tooltip')).toBeInTheDocument();
    expect(screen.queryByText('Some Super User')).not.toBeInTheDocument();
    expect(await screen.findByText('user')).toBeInTheDocument();
    expect(await screen.findByText('SU')).toBeInTheDocument();
    expect(screen.queryByText('some.user@google.com')).not.toBeInTheDocument();
  });

  it('shows an unknown users display name and avatar', async () => {
    render(
      <UserToolTip>
        <strong>{'case user'}</strong>
      </UserToolTip>
    );

    userEvent.hover(await screen.findByText('case user'));

    expect(await screen.findByTestId('user-profile-tooltip')).toBeInTheDocument();
    expect(await screen.findByText('Unable to find user profile')).toBeInTheDocument();
    expect(await screen.findByText('?')).toBeInTheDocument();
  });
});

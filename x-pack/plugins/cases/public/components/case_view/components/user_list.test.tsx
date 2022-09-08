/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserList } from './user_list';
import * as i18n from '../translations';
import { AppMockRenderer, createAppMockRenderer } from '../../../common/mock';
import { userProfiles, userProfilesMap } from '../../../containers/user_profiles/api.mock';

describe('UserList ', () => {
  const title = 'Case Title';
  const caseLink = 'http://reddit.com';
  const user = { username: 'username', fullName: 'Full Name', email: 'testemail@elastic.co' };
  const open = jest.fn();

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    window.open = open;
    appMockRender = createAppMockRenderer();
  });

  it('triggers mailto when email icon clicked', () => {
    appMockRender.render(
      <UserList
        email={{
          subject: i18n.EMAIL_SUBJECT(title),
          body: i18n.EMAIL_BODY(caseLink),
        }}
        headline={i18n.REPORTER}
        users={[user]}
        userProfiles={new Map()}
      />
    );

    userEvent.click(screen.getByTestId('user-list-email-button'));
    expect(open).toBeCalledWith(
      `mailto:${user.email}?subject=${i18n.EMAIL_SUBJECT(title)}&body=${i18n.EMAIL_BODY(caseLink)}`,
      '_blank'
    );
  });

  it('renders an unknown user when the profile uid is not found', () => {
    appMockRender.render(
      <UserList
        email={{
          subject: '',
          body: '',
        }}
        headline={''}
        users={[{ profileUid: '123' }]}
        userProfiles={new Map()}
      />
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders the full name when the profile uid is found', () => {
    appMockRender.render(
      <UserList
        email={{
          subject: '',
          body: '',
        }}
        headline={''}
        users={[{ profileUid: userProfiles[0].uid }]}
        userProfiles={userProfilesMap}
      />
    );

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('renders the full name when the profile uid is not found and the full name is present', () => {
    appMockRender.render(
      <UserList
        email={{
          subject: '',
          body: '',
        }}
        headline={''}
        users={[{ username: 'sam', fullName: 'Sam Smith', profileUid: '123' }]}
        userProfiles={userProfilesMap}
      />
    );

    expect(screen.getByText('Sam Smith')).toBeInTheDocument();
  });

  it('renders the full name when the profile uid is not present and the full name is present', () => {
    appMockRender.render(
      <UserList
        email={{
          subject: '',
          body: '',
        }}
        headline={''}
        users={[{ username: 'sam', fullName: 'Sam Smith' }]}
        userProfiles={userProfilesMap}
      />
    );

    expect(screen.getByText('Sam Smith')).toBeInTheDocument();
  });
});

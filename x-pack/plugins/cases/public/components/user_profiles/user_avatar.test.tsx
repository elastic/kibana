/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { CaseUserAvatar } from './user_avatar';
import type { UserInfoWithAvatar } from './types';

describe('CaseUserAvatar', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders the avatar of Damaged Raccoon profile', () => {
    appMockRender.render(<CaseUserAvatar size="s" userInfo={userProfiles[0]} />);

    expect(screen.getByText('DR')).toBeInTheDocument();
  });

  it('renders the avatar of the unknown profile', () => {
    appMockRender.render(<CaseUserAvatar size="s" />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders the avatar without avatar data', () => {
    const userInfo: UserInfoWithAvatar = {
      user: {
        username: 'Super_user',
      },
    };

    appMockRender.render(<CaseUserAvatar size="s" userInfo={userInfo} />);

    expect(screen.getByText('S')).toBeInTheDocument();
  });
});

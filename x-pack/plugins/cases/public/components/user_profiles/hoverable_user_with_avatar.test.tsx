/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { HoverableUserWithAvatar } from './hoverable_user_with_avatar';
import { userProfiles } from '../../containers/user_profiles/api.mock';

describe('HoverableUserWithAvatar', () => {
  it('renders the avatar and name', () => {
    render(<HoverableUserWithAvatar userInfo={userProfiles[0]} />);

    expect(screen.getByText('DR')).toBeInTheDocument();
    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });
});

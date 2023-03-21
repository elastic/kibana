/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Username } from './username';
import { userProfiles } from '../../containers/user_profiles/api.mock';

describe('Username', () => {
  it('renders the name', () => {
    render(<Username userInfo={userProfiles[0]} />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.queryByTestId('user-profile-username-bolded')).not.toBeInTheDocument();
  });

  it('renders the name bolded', () => {
    render(<Username userInfo={userProfiles[0]} boldName />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByTestId('user-profile-username-bolded')).toBeInTheDocument();
  });
});

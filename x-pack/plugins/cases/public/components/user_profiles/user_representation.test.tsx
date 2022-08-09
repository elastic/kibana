/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { UserRepresentation, UserRepresentationProps } from './user_representation';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';

describe('UserRepresentation', () => {
  let defaultProps: UserRepresentationProps;
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    defaultProps = {
      profile: userProfiles[0],
      onRemoveAssignee: jest.fn(),
    };

    appMockRender = createAppMockRenderer();
  });

  it('does not show the cross button when the user is not hovering over the row', () => {
    appMockRender.render(<UserRepresentation {...defaultProps} />);

    expect(screen.queryByTestId('user-profile-assigned-user-cross')).not.toBeInTheDocument();
  });

  it('does show the cross button when the user is hovering over the row', () => {
    appMockRender.render(<UserRepresentation {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByTestId('user-profile-assigned-user-group'));

    expect(screen.getByTestId('user-profile-assigned-user-cross')).toBeInTheDocument();
  });

  it('shows and then removes the cross button when the user hovers and removes the mouse over the row', () => {
    appMockRender.render(<UserRepresentation {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByTestId('user-profile-assigned-user-group'));
    expect(screen.getByTestId('user-profile-assigned-user-cross')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId('user-profile-assigned-user-group'));
    expect(screen.queryByTestId('user-profile-assigned-user-cross')).not.toBeInTheDocument();
  });
});

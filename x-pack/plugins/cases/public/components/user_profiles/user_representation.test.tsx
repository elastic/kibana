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
  const dataTestSubjGroup = `user-profile-assigned-user-group-${userProfiles[0].user.username}`;
  const dataTestSubjCross = `user-profile-assigned-user-cross-${userProfiles[0].user.username}`;

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

    expect(screen.queryByTestId(dataTestSubjCross)).not.toBeInTheDocument();
  });

  it('show the cross button when the user is hovering over the row', () => {
    appMockRender.render(<UserRepresentation {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByTestId(dataTestSubjGroup));

    expect(screen.getByTestId(dataTestSubjCross)).toBeInTheDocument();
  });

  it('shows and then removes the cross button when the user hovers and removes the mouse from over the row', () => {
    appMockRender.render(<UserRepresentation {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByTestId(dataTestSubjGroup));
    expect(screen.getByTestId(dataTestSubjCross)).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId(dataTestSubjGroup));
    expect(screen.queryByTestId(dataTestSubjCross)).not.toBeInTheDocument();
  });
});

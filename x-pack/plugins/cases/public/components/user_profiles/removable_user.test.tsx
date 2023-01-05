/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import type { UserRepresentationProps } from './removable_user';
import { RemovableUser } from './removable_user';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, noUpdateCasesPermissions } from '../../common/mock';

describe('UserRepresentation', () => {
  const dataTestSubjGroup = `user-profile-assigned-user-group-${userProfiles[0].user.username}`;
  const dataTestSubjCross = `user-profile-assigned-user-cross-${userProfiles[0].user.username}`;
  const dataTestSubjGroupUnknown = `user-profile-assigned-user-group-unknownId`;
  const dataTestSubjCrossUnknown = `user-profile-assigned-user-cross-unknownId`;

  let defaultProps: UserRepresentationProps;
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    defaultProps = {
      assignee: { uid: userProfiles[0].uid, profile: userProfiles[0] },
      onRemoveAssignee: jest.fn(),
    };

    appMockRender = createAppMockRenderer();
  });

  it('does not show the cross button when the user is not hovering over the row', () => {
    appMockRender.render(<RemovableUser {...defaultProps} />);

    expect(screen.queryByTestId(dataTestSubjCross)).toHaveStyle('opacity: 0');
  });

  it('show the cross button when the user is hovering over the row', () => {
    appMockRender.render(<RemovableUser {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByTestId(dataTestSubjGroup));

    expect(screen.getByTestId(dataTestSubjCross)).toHaveStyle('opacity: 1');
  });

  it('show the cross button when hovering over the row of an unknown user', () => {
    appMockRender.render(
      <RemovableUser {...{ ...defaultProps, assignee: { uid: 'unknownId' } }} />
    );

    fireEvent.mouseEnter(screen.getByTestId(dataTestSubjGroupUnknown));

    expect(screen.getByTestId(dataTestSubjCrossUnknown)).toHaveStyle('opacity: 1');
  });

  it('shows and then removes the cross button when the user hovers and removes the mouse from over the row', () => {
    appMockRender.render(<RemovableUser {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByTestId(dataTestSubjGroup));
    expect(screen.getByTestId(dataTestSubjCross)).toHaveStyle('opacity: 1');

    fireEvent.mouseLeave(screen.getByTestId(dataTestSubjGroup));
    expect(screen.queryByTestId(dataTestSubjCross)).toHaveStyle('opacity: 0');
  });

  it("renders unknown for the user's information", () => {
    appMockRender.render(
      <RemovableUser {...{ ...defaultProps, assignee: { uid: 'unknownId' } }} />
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('does not show the cross button when the user is hovering over the row and does not have update permissions', () => {
    appMockRender = createAppMockRenderer({ permissions: noUpdateCasesPermissions() });
    appMockRender.render(<RemovableUser {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByTestId(dataTestSubjGroup));

    expect(screen.queryByTestId(dataTestSubjCross)).not.toBeInTheDocument();
  });
});

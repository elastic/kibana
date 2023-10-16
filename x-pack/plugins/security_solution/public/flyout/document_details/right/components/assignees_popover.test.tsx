/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import { ASSIGNEES_ADD_BUTTON_TEST_ID } from './test_ids';
import { AssigneesPopover } from './assignees_popover';

import { useSuggestUsers } from '../../../../detections/containers/detection_engine/alerts/use_suggest_users';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../detections/containers/detection_engine/alerts/use_suggest_users');

const mockUserProfiles: UserProfileWithAvatar[] = [
  {
    uid: 'user-id-1',
    enabled: true,
    user: { username: 'user1', full_name: 'User 1', email: 'user1@test.com' },
    data: {},
  },
  {
    uid: 'user-id-2',
    enabled: true,
    user: { username: 'user2', full_name: 'User 2', email: 'user2@test.com' },
    data: {},
  },
  {
    uid: 'user-id-3',
    enabled: true,
    user: { username: 'user3', full_name: 'User 3', email: 'user3@test.com' },
    data: {},
  },
];

const renderAssigneesPopover = (
  alertAssignees: string[],
  isPopoverOpen: boolean,
  onUsersChange = jest.fn(),
  togglePopover = jest.fn(),
  onClosePopover = jest.fn()
) =>
  render(
    <TestProviders>
      <AssigneesPopover
        existingAssigneesIds={alertAssignees}
        isPopoverOpen={isPopoverOpen}
        onUsersChange={onUsersChange}
        onClosePopover={onClosePopover}
        togglePopover={togglePopover}
      />
    </TestProviders>
  );

describe('<AssigneesPopover />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSuggestUsers as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: mockUserProfiles,
    });
  });

  it('should render closed popover component', () => {
    const { getByTestId, queryByTestId } = renderAssigneesPopover([], false);

    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId('euiSelectableList')).not.toBeInTheDocument();
  });

  it('should render opened popover component', () => {
    const { getByTestId } = renderAssigneesPopover([], true);

    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('euiSelectableList')).toBeInTheDocument();
  });

  it('should render assignees', () => {
    const { getByTestId } = renderAssigneesPopover([], true);

    const assigneesList = getByTestId('euiSelectableList');
    expect(assigneesList).toHaveTextContent('User 1');
    expect(assigneesList).toHaveTextContent('user1@test.com');
    expect(assigneesList).toHaveTextContent('User 2');
    expect(assigneesList).toHaveTextContent('user2@test.com');
    expect(assigneesList).toHaveTextContent('User 3');
    expect(assigneesList).toHaveTextContent('user3@test.com');
  });

  it('should call onUsersChange on clsing the popover', () => {
    const onUsersChangeMock = jest.fn();
    const { getByText } = renderAssigneesPopover([], true, onUsersChangeMock);

    getByText('User 1').click();
    getByText('User 2').click();
    getByText('User 3').click();
    getByText('User 3').click();
    getByText('User 2').click();
    getByText('User 1').click();

    expect(onUsersChangeMock).toHaveBeenCalledTimes(6);
    expect(onUsersChangeMock.mock.calls).toEqual([
      [['user-id-1']],
      [['user-id-2', 'user-id-1']],
      [['user-id-3', 'user-id-2', 'user-id-1']],
      [['user-id-2', 'user-id-1']],
      [['user-id-1']],
      [[]],
    ]);
  });

  it('should call togglePopover on add button click', () => {
    const togglePopoverMock = jest.fn();
    const { getByTestId } = renderAssigneesPopover([], false, jest.fn(), togglePopoverMock);

    getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID).click();

    expect(togglePopoverMock).toHaveBeenCalledTimes(1);
  });
});

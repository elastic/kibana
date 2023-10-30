/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { ASSIGNEES_ADD_BUTTON_TEST_ID, ASSIGNEES_TITLE_TEST_ID } from './test_ids';
import { Assignees } from './assignees';

import { useGetUserProfiles } from '../../../../detections/containers/detection_engine/user_profiles/use_get_user_profiles';
import { useSuggestUsers } from '../../../../detections/containers/detection_engine/user_profiles/use_suggest_users';
import type { SetAlertAssigneesFunc } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { useSetAlertAssignees } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { TestProviders } from '../../../../common/mock';
import {
  ASSIGNEES_APPLY_BUTTON_TEST_ID,
  ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID,
  ASSIGNEES_AVATARS_PANEL_TEST_ID,
  ASSIGNEES_AVATAR_ITEM_TEST_ID,
} from '../../../../common/components/assignees/test_ids';

jest.mock('../../../../detections/containers/detection_engine/user_profiles/use_get_user_profiles');
jest.mock('../../../../detections/containers/detection_engine/user_profiles/use_suggest_users');
jest.mock('../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees');

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'user1', full_name: 'User 1' }, data: {} },
  { uid: 'user-id-2', enabled: true, user: { username: 'user2', full_name: 'User 2' }, data: {} },
  { uid: 'user-id-3', enabled: true, user: { username: 'user3', full_name: 'User 3' }, data: {} },
];

const renderAssignees = (
  eventId = 'event-1',
  alertAssignees = ['user-id-1'],
  onAssigneesUpdated = jest.fn()
) =>
  render(
    <TestProviders>
      <Assignees
        eventId={eventId}
        assignedUserIds={alertAssignees}
        onAssigneesUpdated={onAssigneesUpdated}
      />
    </TestProviders>
  );

describe('<Assignees />', () => {
  let setAlertAssigneesMock: jest.Mocked<SetAlertAssigneesFunc>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetUserProfiles as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: mockUserProfiles,
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: mockUserProfiles,
    });

    setAlertAssigneesMock = jest.fn().mockReturnValue(Promise.resolve());
    (useSetAlertAssignees as jest.Mock).mockReturnValue(setAlertAssigneesMock);
  });

  it('should render component', () => {
    const { getByTestId } = renderAssignees();

    expect(getByTestId(ASSIGNEES_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_AVATARS_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render assignees avatars', () => {
    const assignees = ['user-id-1', 'user-id-2'];
    const { getByTestId, queryByTestId } = renderAssignees('test-event', assignees);

    expect(getByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user1'))).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user2'))).toBeInTheDocument();

    expect(queryByTestId(ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render badge with assignees count in case there are more than two users assigned to an alert', () => {
    const assignees = ['user-id-1', 'user-id-2', 'user-id-3'];
    const { getByTestId, queryByTestId } = renderAssignees('test-event', assignees);

    const assigneesCountBadge = getByTestId(ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID);
    expect(assigneesCountBadge).toBeInTheDocument();
    expect(assigneesCountBadge).toHaveTextContent(`${assignees.length}`);

    expect(queryByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user1'))).not.toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user2'))).not.toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user3'))).not.toBeInTheDocument();
  });

  it('should call assignees update functionality with the right arguments', () => {
    const assignedProfiles = [mockUserProfiles[0], mockUserProfiles[1]];
    (useGetUserProfiles as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: assignedProfiles,
    });

    const assignees = assignedProfiles.map((assignee) => assignee.uid);
    const { getByTestId, getByText } = renderAssignees('test-event', assignees);

    // Update assignees
    getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID).click();
    getByText('User 1').click();
    getByText('User 3').click();

    // Apply assignees
    getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID).click();

    expect(setAlertAssigneesMock).toHaveBeenCalledWith(
      {
        assignees_to_add: ['user-id-3'],
        assignees_to_remove: ['user-id-1'],
      },
      ['test-event'],
      expect.anything(),
      expect.anything()
    );
  });
});

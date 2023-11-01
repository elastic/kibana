/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import {
  ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID,
  ASSIGNEES_AVATARS_LOADING_TEST_ID,
  ASSIGNEES_AVATARS_PANEL_TEST_ID,
  ASSIGNEES_AVATAR_ITEM_TEST_ID,
} from './test_ids';
import { AssigneesAvatarsPanel } from './assignees_avatars_panel';

import { useGetUserProfiles } from '../user_profiles/use_get_user_profiles';
import { TestProviders } from '../../mock';
import { mockUserProfiles } from './mocks';

jest.mock('../../../detections/containers/detection_engine/user_profiles/use_get_user_profiles');

const renderAssigneesAvatarsPanel = (assignedUserIds = ['user-id-1'], maxVisibleAvatars = 1) =>
  render(
    <TestProviders>
      <AssigneesAvatarsPanel
        assignedUserIds={assignedUserIds}
        maxVisibleAvatars={maxVisibleAvatars}
      />
    </TestProviders>
  );

describe('<AssigneesAvatarsPanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGetUserProfiles as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: mockUserProfiles,
    });
  });

  it('should render component', () => {
    const { getByTestId } = renderAssigneesAvatarsPanel();

    expect(getByTestId(ASSIGNEES_AVATARS_PANEL_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading state', () => {
    (useGetUserProfiles as jest.Mock).mockReturnValue({
      loading: true,
      userProfiles: mockUserProfiles,
    });
    const assignees = ['user-id-1', 'user-id-2', 'user-id-3'];
    const { getByTestId, queryByTestId } = renderAssigneesAvatarsPanel(assignees);

    expect(getByTestId(ASSIGNEES_AVATARS_LOADING_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_AVATARS_PANEL_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render avatars for all assignees', () => {
    const assignees = ['user-id-1', 'user-id-2'];
    const { getByTestId, queryByTestId } = renderAssigneesAvatarsPanel(assignees, 2);

    expect(getByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user1'))).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user2'))).toBeInTheDocument();

    expect(queryByTestId(ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render badge with number of assignees if exceeds `maxVisibleAvatars`', () => {
    const assignees = ['user-id-1', 'user-id-2'];
    const { getByTestId, queryByTestId } = renderAssigneesAvatarsPanel(assignees, 1);

    expect(getByTestId(ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID)).toBeInTheDocument();

    expect(queryByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user1'))).not.toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_AVATAR_ITEM_TEST_ID('user2'))).not.toBeInTheDocument();
  });
});

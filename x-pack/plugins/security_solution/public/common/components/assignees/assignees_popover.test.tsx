/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { ASSIGNEES_APPLY_PANEL_TEST_ID } from './test_ids';
import { AssigneesPopover } from './assignees_popover';

import { useGetUserProfiles } from '../../../detections/containers/detection_engine/user_profiles/use_get_user_profiles';
import { useSuggestUsers } from '../../../detections/containers/detection_engine/user_profiles/use_suggest_users';
import { TestProviders } from '../../mock';
import { mockUserProfiles } from './mocks';
import { EuiButton } from '@elastic/eui';

jest.mock('../../../detections/containers/detection_engine/user_profiles/use_get_user_profiles');
jest.mock('../../../detections/containers/detection_engine/user_profiles/use_suggest_users');

const MOCK_BUTTON_TEST_ID = 'mock-assignees-button';

const renderAssigneesPopover = ({
  assignedUserIds,
  isPopoverOpen,
}: {
  assignedUserIds: string[];
  isPopoverOpen: boolean;
}) =>
  render(
    <TestProviders>
      <AssigneesPopover
        assignedUserIds={assignedUserIds}
        button={<EuiButton data-test-subj={MOCK_BUTTON_TEST_ID} />}
        isPopoverOpen={isPopoverOpen}
        closePopover={jest.fn()}
      />
    </TestProviders>
  );

describe('<AssigneesPopover />', () => {
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
  });

  it('should render closed popover component', () => {
    const { getByTestId, queryByTestId } = renderAssigneesPopover({
      assignedUserIds: [],
      isPopoverOpen: false,
    });

    expect(getByTestId(MOCK_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_APPLY_PANEL_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render opened popover component', () => {
    const { getByTestId } = renderAssigneesPopover({
      assignedUserIds: [],
      isPopoverOpen: true,
    });

    expect(getByTestId(MOCK_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_APPLY_PANEL_TEST_ID)).toBeInTheDocument();
  });

  it('should render assignees', () => {
    const { getByTestId } = renderAssigneesPopover({
      assignedUserIds: [],
      isPopoverOpen: true,
    });

    const assigneesList = getByTestId('euiSelectableList');
    expect(assigneesList).toHaveTextContent('User 1');
    expect(assigneesList).toHaveTextContent('user1@test.com');
    expect(assigneesList).toHaveTextContent('User 2');
    expect(assigneesList).toHaveTextContent('user2@test.com');
    expect(assigneesList).toHaveTextContent('User 3');
    expect(assigneesList).toHaveTextContent('user3@test.com');
  });
});

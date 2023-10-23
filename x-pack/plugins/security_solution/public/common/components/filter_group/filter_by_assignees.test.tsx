/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { FilterByAssigneesPopover } from './filter_by_assignees';
import { TEST_IDS } from './constants';
import { TestProviders } from '../../mock';

const mockUserProfiles = [
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
jest.mock('../../../detections/containers/detection_engine/alerts/use_suggest_users', () => {
  return {
    useSuggestUsers: () => ({
      loading: false,
      userProfiles: mockUserProfiles,
    }),
  };
});

const renderFilterByAssigneesPopover = (alertAssignees?: string[], onUsersChange = jest.fn()) =>
  render(
    <TestProviders>
      <FilterByAssigneesPopover
        existingAssigneesIds={alertAssignees}
        onUsersChange={onUsersChange}
      />
    </TestProviders>
  );

describe('<FilterByAssigneesPopover />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render closed popover component', () => {
    const { getByTestId, queryByTestId } = renderFilterByAssigneesPopover();

    expect(getByTestId(TEST_IDS.FILTER_BY_ASSIGNEES_BUTTON)).toBeInTheDocument();
    expect(queryByTestId('euiSelectableList')).not.toBeInTheDocument();
  });

  it('should render opened popover component', () => {
    const { getByTestId } = renderFilterByAssigneesPopover();

    getByTestId(TEST_IDS.FILTER_BY_ASSIGNEES_BUTTON).click();
    expect(getByTestId('euiSelectableList')).toBeInTheDocument();
  });

  it('should render assignees', () => {
    const { getByTestId } = renderFilterByAssigneesPopover();

    getByTestId(TEST_IDS.FILTER_BY_ASSIGNEES_BUTTON).click();

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
    const { getByTestId, getByText } = renderFilterByAssigneesPopover([], onUsersChangeMock);

    getByTestId(TEST_IDS.FILTER_BY_ASSIGNEES_BUTTON).click();

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
});

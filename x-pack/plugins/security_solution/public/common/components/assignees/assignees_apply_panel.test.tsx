/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { ASSIGNEES_APPLY_BUTTON_TEST_ID, ASSIGNEES_APPLY_PANEL_TEST_ID } from './test_ids';
import { AssigneesApplyPanel } from './assignees_apply_panel';

import { useGetCurrentUserProfile } from '../user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../user_profiles/use_suggest_users';
import type { SetAlertAssigneesFunc } from '../toolbar/bulk_actions/use_set_alert_assignees';
import { useSetAlertAssignees } from '../toolbar/bulk_actions/use_set_alert_assignees';
import { TestProviders } from '../../mock';
import { mockUserProfiles } from './mocks';
import { noop } from 'lodash';

jest.mock('../user_profiles/use_get_current_user_profile');
jest.mock('../user_profiles/use_bulk_get_user_profiles');
jest.mock('../user_profiles/use_suggest_users');
jest.mock('../toolbar/bulk_actions/use_set_alert_assignees');

const renderAssigneesApplyPanel = (
  {
    alertIds,
    assignedUserIds,
  }: {
    alertIds: string[];
    assignedUserIds: string[];
  } = {
    alertIds: [],
    assignedUserIds: [],
  }
) => {
  const assignedProfiles = mockUserProfiles.filter((user) => assignedUserIds.includes(user.uid));
  (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
    isLoading: false,
    data: assignedProfiles,
  });
  return render(
    <TestProviders>
      <AssigneesApplyPanel
        alertIds={alertIds}
        assignedUserIds={assignedUserIds}
        onApplyStarted={noop}
        onApplySuccess={noop}
        setTableLoading={noop}
      />
    </TestProviders>
  );
};

describe('<AssigneesApplyPanel />', () => {
  let setAlertAssigneesMock: jest.Mocked<SetAlertAssigneesFunc>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetCurrentUserProfile as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles[0],
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
    setAlertAssigneesMock = jest.fn().mockReturnValue(Promise.resolve());
    (useSetAlertAssignees as jest.Mock).mockReturnValue(setAlertAssigneesMock);
  });

  it('should render component', () => {
    const { getByTestId } = renderAssigneesApplyPanel();

    expect(getByTestId(ASSIGNEES_APPLY_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('should call `setAlertAssignees` on apply button click', () => {
    const { getByText, getByTestId } = renderAssigneesApplyPanel({
      alertIds: ['alert1', 'alert4'],
      assignedUserIds: ['user-id-1'],
    });

    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).toBeDisabled();
    getByText(mockUserProfiles[1].user.full_name).click();
    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).not.toBeDisabled();
    getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID).click();

    expect(setAlertAssigneesMock).toHaveBeenCalledWith(
      {
        add: ['user-id-2'],
        remove: [],
      },
      ['alert1', 'alert4'],
      expect.anything(),
      expect.anything()
    );
  });
});

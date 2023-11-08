/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { renderHook } from '@testing-library/react-hooks';
import type { UseAssigneesActionItemsProps } from './use_assignees_actions';
import { useAssigneesActionItems } from './use_assignees_actions';
import { useSetAlertAssignees } from '../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { useGetCurrentUser } from '../../../common/components/user_profiles/use_get_current_user';
import { useBulkGetUserProfiles } from '../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../../../common/components/user_profiles/use_suggest_users';
import type { BulkActionsConfig } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { TimelineItem } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/bulk_actions/components/toolbar';

jest.mock('../../../common/components/toolbar/bulk_actions/use_set_alert_assignees');
jest.mock('../../../common/components/user_profiles/use_get_current_user');
jest.mock('../../../common/components/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../common/components/user_profiles/use_suggest_users');

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'fakeUser1' }, data: {} },
  { uid: 'user-id-2', enabled: true, user: { username: 'fakeUser2' }, data: {} },
];

const defaultProps: UseAssigneesActionItemsProps = {
  refetch: () => {},
};

describe('useAssigneesActionItems', () => {
  beforeEach(() => {
    (useSetAlertAssignees as jest.Mock).mockReturnValue(jest.fn());
    (useGetCurrentUser as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles[0],
    });
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return two alert assignees action items and one panel', () => {
    const { result } = renderHook(() => useAssigneesActionItems(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.alertAssigneesItems.length).toEqual(2);
    expect(result.current.alertAssigneesPanels.length).toEqual(1);

    expect(result.current.alertAssigneesItems[0]['data-test-subj']).toEqual(
      'alert-assignees-context-menu-item'
    );
    expect(result.current.alertAssigneesItems[1]['data-test-subj']).toEqual(
      'bulk-alert-assignees-remove-all-action'
    );
    expect(result.current.alertAssigneesPanels[0]['data-test-subj']).toEqual(
      'alert-assignees-context-menu-panel'
    );
  });

  it('should call setAlertAssignees returned by useSetAlertAssignees with the correct parameters', () => {
    const mockSetAlertAssignees = jest.fn();
    (useSetAlertAssignees as jest.Mock).mockReturnValue(mockSetAlertAssignees);
    const { result } = renderHook(() => useAssigneesActionItems(defaultProps), {
      wrapper: TestProviders,
    });

    const items: TimelineItem[] = [
      {
        _id: 'alert1',
        data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['user1', 'user2'] }],
        ecs: { _id: 'alert1', _index: 'index1' },
      },
      {
        _id: 'alert2',
        data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['user1', 'user3'] }],
        ecs: { _id: 'alert2', _index: 'index1' },
      },
      {
        _id: 'alert3',
        data: [],
        ecs: { _id: 'alert3', _index: 'index1' },
      },
    ];

    const refreshMock = jest.fn();
    const setAlertLoadingMock = jest.fn();
    (
      result.current.alertAssigneesItems[1] as unknown as { onClick: BulkActionsConfig['onClick'] }
    ).onClick?.(items, true, setAlertLoadingMock, jest.fn(), refreshMock);

    expect(mockSetAlertAssignees).toHaveBeenCalled();
    expect(mockSetAlertAssignees).toHaveBeenCalledWith(
      { assignees_to_add: [], assignees_to_remove: ['user1', 'user2', 'user3'] },
      ['alert1', 'alert2', 'alert3'],
      refreshMock,
      setAlertLoadingMock
    );
  });
});

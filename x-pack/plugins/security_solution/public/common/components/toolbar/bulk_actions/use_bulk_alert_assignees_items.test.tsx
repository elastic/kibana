/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { act, fireEvent, render } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import type {
  UseBulkAlertAssigneesItemsProps,
  UseBulkAlertAssigneesPanel,
} from './use_bulk_alert_assignees_items';
import { useBulkAlertAssigneesItems } from './use_bulk_alert_assignees_items';
import { useSetAlertAssignees } from './use_set_alert_assignees';
import { useGetCurrentUser } from '../../user_profiles/use_get_current_user';
import { useBulkGetUserProfiles } from '../../user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../../user_profiles/use_suggest_users';
import { ASSIGNEES_APPLY_BUTTON_TEST_ID } from '../../assignees/test_ids';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';

jest.mock('./use_set_alert_assignees');
jest.mock('../../user_profiles/use_get_current_user');
jest.mock('../../user_profiles/use_bulk_get_user_profiles');
jest.mock('../../user_profiles/use_suggest_users');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'fakeUser1' }, data: {} },
  { uid: 'user-id-2', enabled: true, user: { username: 'fakeUser2' }, data: {} },
];

const defaultProps: UseBulkAlertAssigneesItemsProps = {
  refetch: () => {},
};

const mockAssigneeItems = [
  {
    _id: 'test-id',
    data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['user-id-1', 'user-id-2'] }],
    ecs: { _id: 'test-id', _index: 'test-index' },
  },
];

const renderPanel = (panel: UseBulkAlertAssigneesPanel) => {
  const content = panel.renderContent({
    closePopoverMenu: jest.fn(),
    setIsBulkActionsLoading: jest.fn(),
    alertItems: mockAssigneeItems,
  });
  return render(content);
};

describe('useBulkAlertAssigneesItems', () => {
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
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasIndexWrite: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert assignees actions', () => {
    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertAssigneesItems.length).toEqual(1);
    expect(result.current.alertAssigneesPanels.length).toEqual(1);

    expect(result.current.alertAssigneesItems[0]['data-test-subj']).toEqual(
      'alert-assignees-context-menu-item'
    );
    expect(result.current.alertAssigneesPanels[0]['data-test-subj']).toEqual(
      'alert-assignees-context-menu-panel'
    );
  });

  it('should still render alert assignees panel when useSetAlertAssignees is null', () => {
    (useSetAlertAssignees as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.alertAssigneesPanels[0]['data-test-subj']).toEqual(
      'alert-assignees-context-menu-panel'
    );
    const wrapper = renderPanel(result.current.alertAssigneesPanels[0]);
    expect(wrapper.getByTestId('alert-assignees-selectable-menu')).toBeInTheDocument();
  });

  it('should call setAlertAssignees on submit', () => {
    const mockSetAlertAssignees = jest.fn();
    (useSetAlertAssignees as jest.Mock).mockReturnValue(mockSetAlertAssignees);
    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });

    const wrapper = renderPanel(result.current.alertAssigneesPanels[0]);
    expect(wrapper.getByTestId('alert-assignees-selectable-menu')).toBeInTheDocument();
    act(() => {
      fireEvent.click(wrapper.getByText('fakeUser2')); // Won't fire unless component assignees selection has been changed
    });
    act(() => {
      fireEvent.click(wrapper.getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID));
    });
    expect(mockSetAlertAssignees).toHaveBeenCalled();
  });

  it('should return 0 items for the VIEWER role', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasIndexWrite: false });

    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertAssigneesItems.length).toEqual(0);
    expect(result.current.alertAssigneesPanels.length).toEqual(0);
  });
});

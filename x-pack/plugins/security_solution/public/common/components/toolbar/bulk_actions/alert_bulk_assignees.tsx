/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash/fp';
import { intersection } from 'lodash';
import { EuiButton } from '@elastic/eui';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfilesSelectable } from '@kbn/user-profile-components';
import { useGetUserProfiles } from '../../../../detections/containers/detection_engine/alerts/use_get_user_profiles';
import { useSuggestUsers } from '../../../../detections/containers/detection_engine/alerts/use_suggest_users';
import * as i18n from './translations';
import type { SetAlertAssigneesFunc } from './use_set_alert_assignees';

interface BulkAlertAssigneesPanelComponentProps {
  alertItems: TimelineItem[];
  refetchQuery?: () => void;
  setIsLoading: (isLoading: boolean) => void;
  refresh?: () => void;
  clearSelection?: () => void;
  closePopoverMenu: () => void;
  onSubmit: SetAlertAssigneesFunc;
}
const BulkAlertAssigneesPanelComponent: React.FC<BulkAlertAssigneesPanelComponentProps> = ({
  alertItems,
  refresh,
  refetchQuery,
  setIsLoading,
  clearSelection,
  closePopoverMenu,
  onSubmit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { loading: isLoadingUsers, userProfiles } = useSuggestUsers(searchTerm);

  const [selectedAssignees, setSelectedAssignees] = useState<UserProfileWithAvatar[]>([]);

  const originalIds = useMemo(
    () =>
      intersection(
        ...alertItems.map(
          (item) =>
            item.data.find((data) => data.field === ALERT_WORKFLOW_ASSIGNEE_IDS)?.value ?? []
        )
      ),
    [alertItems]
  );

  const { loading: isLoadingAssignedUserProfiles, userProfiles: assignedUserProfiles } =
    useGetUserProfiles(originalIds);
  useEffect(() => {
    if (isLoadingAssignedUserProfiles) {
      return;
    }
    setSelectedAssignees(assignedUserProfiles);
  }, [assignedUserProfiles, isLoadingAssignedUserProfiles]);

  const onAssigneesUpdate = useCallback(async () => {
    const updatedIds = selectedAssignees.map((user) => user?.uid);

    const assigneesToAddArray = updatedIds.filter((uid) => !originalIds.includes(uid));
    const assigneesToRemoveArray = originalIds.filter((uid) => !updatedIds.includes(uid));
    if (assigneesToAddArray.length === 0 && assigneesToRemoveArray.length === 0) {
      closePopoverMenu();
      return;
    }

    const ids = alertItems.map((item) => item._id);
    const assignees = {
      assignees_to_add: assigneesToAddArray,
      assignees_to_remove: assigneesToRemoveArray,
    };
    const onSuccess = () => {
      if (refetchQuery) refetchQuery();
      if (refresh) refresh();
      if (clearSelection) clearSelection();
    };
    if (onSubmit != null) {
      closePopoverMenu();
      await onSubmit(assignees, ids, onSuccess, setIsLoading);
    }
  }, [
    alertItems,
    clearSelection,
    closePopoverMenu,
    originalIds,
    onSubmit,
    refetchQuery,
    refresh,
    selectedAssignees,
    setIsLoading,
  ]);

  const handleSelectedAssignees = useCallback(
    (newAssignees: UserProfileWithAvatar[]) => {
      if (!isEqual(newAssignees, selectedAssignees)) {
        setSelectedAssignees(newAssignees);
      }
    },
    [selectedAssignees]
  );

  const selectedStatusMessage = useCallback(
    (selectedCount: number) => i18n.ALERT_TOTAL_ASSIGNEES_FILTERED(selectedCount),
    []
  );

  return (
    <div data-test-subj="alert-assignees-selectable-menu">
      <UserProfilesSelectable
        onChange={handleSelectedAssignees}
        onSearchChange={(term: string) => {
          setSearchTerm(term);
        }}
        selectedStatusMessage={selectedStatusMessage}
        options={userProfiles}
        selectedOptions={selectedAssignees}
        isLoading={isLoadingUsers}
        height={'full'}
        searchPlaceholder={i18n.ALERT_ASSIGNEES_SEARCH_USERS}
        clearButtonLabel={i18n.ALERT_ASSIGNEES_CLEAR_FILTERS}
        singleSelection={false}
        nullOptionLabel={i18n.ALERT_ASSIGNEES_NO_ASSIGNEES}
      />
      <EuiButton
        data-test-subj="alert-assignees-update-button"
        fullWidth
        size="s"
        onClick={onAssigneesUpdate}
        isDisabled={isLoadingUsers}
      >
        {i18n.ALERT_ASSIGNEES_APPLY_BUTTON_MESSAGE}
      </EuiButton>
    </div>
  );
};

export const BulkAlertAssigneesPanel = memo(BulkAlertAssigneesPanelComponent);

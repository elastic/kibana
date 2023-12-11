/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash/fp';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { EuiButton } from '@elastic/eui';
import type { AlertAssignees } from '../../../../common/api/detection_engine';
import * as i18n from './translations';
import type { AssigneesIdsSelection } from './types';
import { removeNoAssigneesSelection } from './utils';
import { ASSIGNEES_APPLY_BUTTON_TEST_ID, ASSIGNEES_APPLY_PANEL_TEST_ID } from './test_ids';
import { AssigneesSelectable } from './assignees_selectable';
import { useSetAlertAssignees } from '../toolbar/bulk_actions/use_set_alert_assignees';

export interface AssigneesApplyPanelProps {
  /**
   * Identifier of search field.
   */
  searchInputId?: string;

  /**
   * Alert ids that will be used to create the update query
   */
  alertIds: string[];

  /**
   * The array of ids of the users assigned to the alert
   */
  assignedUserIds: string[];

  /**
   * A callback function that will be called on apply button click
   */
  onApplyStarted: () => void;

  /**
   * A callback function that will be called on successful api response
   */
  onApplySuccess: () => void;

  /**
   * A function that sets the alert table in a loading state
   */
  setTableLoading: (param: boolean) => void;
}

/**
 * The popover to allow selection of users from a list
 */
export const AssigneesApplyPanel: FC<AssigneesApplyPanelProps> = memo(
  ({
    searchInputId,
    alertIds,
    assignedUserIds,
    onApplyStarted,
    onApplySuccess,
    setTableLoading,
  }) => {
    const setAlertAssignees = useSetAlertAssignees();

    /**
     * We use `selectedUserIds` to keep track of currently selected user ids,
     * whereas `assignedUserIds` holds actually assigned user ids.
     */
    const [selectedUserIds, setSelectedUserIds] =
      useState<AssigneesIdsSelection[]>(assignedUserIds);
    const [assigneesToUpdate, setAssigneesToUpdate] = useState<AlertAssignees>({
      add: [],
      remove: [],
    });
    const isDirty = useMemo(
      () => assigneesToUpdate.add.length || assigneesToUpdate.remove.length,
      [assigneesToUpdate]
    );

    useEffect(() => {
      const updatedIds = removeNoAssigneesSelection(selectedUserIds);
      const assigneesToAddArray = updatedIds.filter((uid) => !assignedUserIds.includes(uid));
      const assigneesToRemoveArray = assignedUserIds.filter((uid) => !updatedIds.includes(uid));

      const toUpdate = {
        add: assigneesToAddArray,
        remove: assigneesToRemoveArray,
      };
      if (!isEqual(toUpdate, assigneesToUpdate)) {
        setAssigneesToUpdate(toUpdate);
      }
    }, [assignedUserIds, assigneesToUpdate, selectedUserIds]);

    const handleSelectionChange = useCallback((userIds: AssigneesIdsSelection[]) => {
      setSelectedUserIds(userIds);
    }, []);

    const handleApplyButtonClick = useCallback(async () => {
      onApplyStarted();
      if (setAlertAssignees && isDirty) {
        await setAlertAssignees(assigneesToUpdate, alertIds, onApplySuccess, setTableLoading);
      }
    }, [
      alertIds,
      assigneesToUpdate,
      isDirty,
      onApplyStarted,
      onApplySuccess,
      setAlertAssignees,
      setTableLoading,
    ]);

    return (
      <div data-test-subj={ASSIGNEES_APPLY_PANEL_TEST_ID}>
        <AssigneesSelectable
          searchInputId={searchInputId}
          assignedUserIds={assignedUserIds}
          onSelectionChange={handleSelectionChange}
        />
        <EuiButton
          data-test-subj={ASSIGNEES_APPLY_BUTTON_TEST_ID}
          fullWidth
          size="s"
          onClick={handleApplyButtonClick}
          isDisabled={!isDirty}
        >
          {i18n.ASSIGNEES_APPLY_BUTTON}
        </EuiButton>
      </div>
    );
  }
);

AssigneesApplyPanel.displayName = 'AssigneesPanel';

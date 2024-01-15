/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';
import React, { memo, useCallback, useMemo } from 'react';

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';

import type { SetAlertAssigneesFunc } from './use_set_alert_assignees';
import { AssigneesApplyPanel } from '../../assignees/assignees_apply_panel';
import type { AssigneesIdsSelection } from '../../assignees/types';
import { removeNoAssigneesSelection } from '../../assignees/utils';

interface BulkAlertAssigneesPanelComponentProps {
  alertItems: TimelineItem[];
  setIsLoading: (isLoading: boolean) => void;
  refresh?: () => void;
  clearSelection?: () => void;
  closePopoverMenu: () => void;
  onSubmit: SetAlertAssigneesFunc;
}
const BulkAlertAssigneesPanelComponent: React.FC<BulkAlertAssigneesPanelComponentProps> = ({
  alertItems,
  refresh,
  setIsLoading,
  clearSelection,
  closePopoverMenu,
  onSubmit,
}) => {
  const assignedUserIds = useMemo(
    () =>
      intersection(
        ...alertItems.map(
          (item) =>
            item.data.find((data) => data.field === ALERT_WORKFLOW_ASSIGNEE_IDS)?.value ?? []
        )
      ),
    [alertItems]
  );

  const onAssigneesApply = useCallback(
    async (assigneesIds: AssigneesIdsSelection[]) => {
      const updatedIds = removeNoAssigneesSelection(assigneesIds);
      const assigneesToAddArray = updatedIds.filter((uid) => uid && !assignedUserIds.includes(uid));
      const assigneesToRemoveArray = assignedUserIds.filter(
        (uid) => uid && !updatedIds.includes(uid)
      );
      if (assigneesToAddArray.length === 0 && assigneesToRemoveArray.length === 0) {
        closePopoverMenu();
        return;
      }

      const ids = alertItems.map((item) => item._id);
      const assignees = {
        add: assigneesToAddArray,
        remove: assigneesToRemoveArray,
      };
      const onSuccess = () => {
        if (refresh) refresh();
        if (clearSelection) clearSelection();
      };
      if (onSubmit != null) {
        closePopoverMenu();
        await onSubmit(assignees, ids, onSuccess, setIsLoading);
      }
    },
    [alertItems, assignedUserIds, clearSelection, closePopoverMenu, onSubmit, refresh, setIsLoading]
  );

  return (
    <div data-test-subj="alert-assignees-selectable-menu">
      <AssigneesApplyPanel assignedUserIds={assignedUserIds} onAssigneesApply={onAssigneesApply} />
    </div>
  );
};

export const BulkAlertAssigneesPanel = memo(BulkAlertAssigneesPanelComponent);

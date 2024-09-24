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
import type { AssigneesApplyPanelProps } from '../../assignees/assignees_apply_panel';
import { AssigneesApplyPanel } from '../../assignees/assignees_apply_panel';

export interface BulkAlertAssigneesPanelComponentProps {
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
  const alertIds = useMemo(() => alertItems.map((item) => item._id), [alertItems]);
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

  const onSuccess = useCallback(() => {
    if (refresh) refresh();
    if (clearSelection) clearSelection();
  }, [clearSelection, refresh]);

  const handleApplyAssignees = useCallback<AssigneesApplyPanelProps['onApply']>(
    async (assignees) => {
      closePopoverMenu();
      if (onSubmit) {
        closePopoverMenu();
        await onSubmit(assignees, alertIds, onSuccess, setIsLoading);
      }
    },
    [alertIds, closePopoverMenu, onSubmit, onSuccess, setIsLoading]
  );

  return (
    <div data-test-subj="alert-assignees-selectable-menu">
      <AssigneesApplyPanel assignedUserIds={assignedUserIds} onApply={handleApplyAssignees} />
    </div>
  );
};

export const BulkAlertAssigneesPanel = memo(BulkAlertAssigneesPanelComponent);

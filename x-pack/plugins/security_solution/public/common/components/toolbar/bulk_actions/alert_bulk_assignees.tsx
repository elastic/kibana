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

import { AssigneesApplyPanel } from '../../assignees/assignees_apply_panel';

interface BulkAlertAssigneesPanelComponentProps {
  alertItems: TimelineItem[];
  setIsLoading: (isLoading: boolean) => void;
  refresh?: () => void;
  clearSelection?: () => void;
  closePopoverMenu: () => void;
}
const BulkAlertAssigneesPanelComponent: React.FC<BulkAlertAssigneesPanelComponentProps> = ({
  alertItems,
  refresh,
  setIsLoading,
  clearSelection,
  closePopoverMenu,
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

  const handleApplyStarted = useCallback(() => {
    closePopoverMenu();
  }, [closePopoverMenu]);

  const handleApplySuccess = useCallback(() => {
    if (refresh) refresh();
    if (clearSelection) clearSelection();
  }, [clearSelection, refresh]);

  return (
    <div data-test-subj="alert-assignees-selectable-menu">
      <AssigneesApplyPanel
        alertIds={alertIds}
        assignedUserIds={assignedUserIds}
        onApplyStarted={handleApplyStarted}
        onApplySuccess={handleApplySuccess}
        setTableLoading={setIsLoading}
      />
    </div>
  );
};

export const BulkAlertAssigneesPanel = memo(BulkAlertAssigneesPanelComponent);

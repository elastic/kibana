/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { union } from 'lodash';

import type { BulkActionsConfig } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';

import { useSetAlertAssignees } from '../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { useBulkAlertAssigneesItems } from '../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import * as i18n from '../translations';

interface UseAssigneesActionItemsProps {
  refetch?: () => void;
}

export const useAssigneesActionItems = ({ refetch }: UseAssigneesActionItemsProps) => {
  const setAlertAssignees = useSetAlertAssignees();

  const { alertAssigneesItems: basicAssigneesItems, alertAssigneesPanels } =
    useBulkAlertAssigneesItems({
      refetch,
    });

  const onActionClick: BulkActionsConfig['onClick'] = async (
    items,
    isSelectAllChecked,
    setAlertLoading,
    clearSelection,
    refresh
  ) => {
    const ids: string[] | undefined = items.map((item) => item._id);
    const assignedUserIds = union(
      ...items.map(
        (item) => item.data.find((data) => data.field === ALERT_WORKFLOW_ASSIGNEE_IDS)?.value ?? []
      )
    );
    if (!assignedUserIds.length) {
      return;
    }
    const assignees = {
      assignees_to_add: [],
      assignees_to_remove: assignedUserIds,
    };
    if (setAlertAssignees) {
      await setAlertAssignees(assignees, ids, refresh, setAlertLoading);
    }
  };

  const alertAssigneesItems = [
    ...basicAssigneesItems,
    ...[
      {
        label: i18n.BULK_REMOVE_ASSIGNEES_CONTEXT_MENU_TITLE,
        key: 'bulk-alert-assignees-remove-all-action',
        'data-test-subj': 'bulk-alert-assignees-remove-all-action',
        disableOnQuery: false,
        onClick: onActionClick,
      },
    ],
  ];

  return {
    alertAssigneesItems,
    alertAssigneesPanels,
  };
};

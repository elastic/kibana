/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { useMemo } from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { useBulkAlertAssigneesItems } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import type { AlertTableContextMenuItem } from '../types';

export interface UseAlertAssigneesActionsProps {
  closePopover: () => void;
  ecsRowData: Ecs;
  refetch?: () => void;
  refresh?: () => void;
}

export const useAlertAssigneesActions = ({
  closePopover,
  ecsRowData,
  refetch,
  refresh,
}: UseAlertAssigneesActionsProps) => {
  const { hasIndexWrite } = useAlertsPrivileges();
  const alertId = ecsRowData._id;
  const alertAssigneeData = useMemo(() => {
    return [
      {
        _id: alertId,
        _index: ecsRowData._index ?? '',
        data: [
          {
            field: ALERT_WORKFLOW_ASSIGNEE_IDS,
            value: ecsRowData?.kibana?.alert.workflow_assignee_ids ?? [],
          },
        ],
        ecs: {
          _id: alertId,
          _index: ecsRowData._index ?? '',
        },
      },
    ];
  }, [alertId, ecsRowData._index, ecsRowData?.kibana?.alert.workflow_assignee_ids]);

  const { alertAssigneesItems, alertAssigneesPanels } = useBulkAlertAssigneesItems({
    refetch,
  });

  const itemsToReturn: AlertTableContextMenuItem[] = useMemo(
    () =>
      alertAssigneesItems.map((item) => ({
        name: item.name,
        panel: item.panel,
        'data-test-subj': item['data-test-subj'],
        key: item.key,
      })),
    [alertAssigneesItems]
  );

  const panelsToReturn: EuiContextMenuPanelDescriptor[] = useMemo(
    () =>
      alertAssigneesPanels.map((panel) => {
        const content = panel.renderContent({
          closePopoverMenu: closePopover,
          setIsBulkActionsLoading: () => {},
          alertItems: alertAssigneeData,
          refresh,
        });
        return { title: panel.title, content, id: panel.id, width: 414 };
      }),
    [alertAssigneeData, alertAssigneesPanels, closePopover, refresh]
  );

  return {
    alertAssigneesItems: hasIndexWrite ? itemsToReturn : [],
    alertAssigneesPanels: panelsToReturn,
  };
};

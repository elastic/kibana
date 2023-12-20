/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import { useCallback, useMemo } from 'react';

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';

import { ASSIGNEES_PANEL_WIDTH } from '../../../../common/components/assignees/constants';
import { useBulkAlertAssigneesItems } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import type { AlertTableContextMenuItem } from '../types';

export interface UseAlertAssigneesActionsProps {
  closePopover: () => void;
  ecsRowData: Ecs;
  refetch?: () => void;
}

export const useAlertAssigneesActions = ({
  closePopover,
  ecsRowData,
  refetch,
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

  const onAssigneesUpdate = useCallback(() => {
    closePopover();
    if (refetch) {
      refetch();
    }
  }, [closePopover, refetch]);

  const { alertAssigneesItems, alertAssigneesPanels } = useBulkAlertAssigneesItems({
    onAssigneesUpdate,
  });

  const itemsToReturn: AlertTableContextMenuItem[] = useMemo(
    () =>
      alertAssigneesItems.map((item) => ({
        name: item.name,
        panel: item.panel,
        'data-test-subj': item['data-test-subj'],
        key: item.key,
        onClick: () => item.onClick?.(alertAssigneeData, false, noop, noop, noop),
      })),
    [alertAssigneeData, alertAssigneesItems]
  );

  const panelsToReturn: EuiContextMenuPanelDescriptor[] = useMemo(
    () =>
      alertAssigneesPanels.map((panel) => {
        const content = panel.renderContent({
          closePopoverMenu: closePopover,
          setIsBulkActionsLoading: () => {},
          alertItems: alertAssigneeData,
          refresh: onAssigneesUpdate,
        });
        return { title: panel.title, content, id: panel.id, width: ASSIGNEES_PANEL_WIDTH };
      }),
    [alertAssigneeData, alertAssigneesPanels, closePopover, onAssigneesUpdate]
  );

  return {
    alertAssigneesItems: hasIndexWrite ? itemsToReturn : [],
    alertAssigneesPanels: panelsToReturn,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { useMemo } from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import { useBulkAlertTagsItems } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import type { AlertTableContextMenuItem } from '../types';

export interface UseAlertTagsActionsProps {
  closePopover: () => void;
  ecsRowData: Ecs;
  refetch?: () => void;
}

export const useAlertTagsActions = ({
  closePopover,
  ecsRowData,
  refetch,
}: UseAlertTagsActionsProps) => {
  const { hasIndexWrite } = useAlertsPrivileges();
  const alertId = ecsRowData._id;
  const alertTagData = useMemo(() => {
    return [
      {
        _id: alertId,
        _index: ecsRowData._index ?? '',
        data: [
          { field: ALERT_WORKFLOW_TAGS, value: ecsRowData?.kibana?.alert.workflow_tags ?? [] },
        ],
        ecs: {
          _id: alertId,
          _index: ecsRowData._index ?? '',
        },
      },
    ];
  }, [alertId, ecsRowData._index, ecsRowData?.kibana?.alert.workflow_tags]);

  const { alertTagsItems, alertTagsPanels } = useBulkAlertTagsItems({
    refetch,
  });

  const itemsToReturn: AlertTableContextMenuItem[] = useMemo(
    () =>
      alertTagsItems.map((item) => ({
        name: item.name,
        panel: item.panel,
        'data-test-subj': item['data-test-subj'],
        key: item.key,
      })),
    [alertTagsItems]
  );

  const panelsToReturn: EuiContextMenuPanelDescriptor[] = useMemo(
    () =>
      alertTagsPanels.map((panel) => {
        const content = panel.renderContent({
          closePopoverMenu: closePopover,
          setIsBulkActionsLoading: () => {},
          alertItems: alertTagData,
        });
        return { title: panel.title, content, id: panel.id };
      }),
    [alertTagData, alertTagsPanels, closePopover]
  );

  return {
    alertTagsItems: hasIndexWrite ? itemsToReturn : [],
    alertTagsPanels: panelsToReturn,
  };
};

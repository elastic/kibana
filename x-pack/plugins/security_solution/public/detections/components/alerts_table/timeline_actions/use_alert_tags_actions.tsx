/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TAGS } from '@kbn/rule-data-utils';
import { useBulkAlertTagsItems } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';
import { getScopedActions } from '../../../../helpers';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import type { AlertTableContextMenuItem } from '../types';

interface Props {
  closePopover: () => void;
  ecsRowData: Ecs;
  scopeId: string;
  refetch?: () => void;
}

export const useAlertTagsActions = ({ closePopover, ecsRowData, scopeId, refetch }: Props) => {
  const dispatch = useDispatch();
  const { hasIndexWrite } = useAlertsPrivileges();
  const alertId = ecsRowData._id;
  const alertTagData = useMemo(
    () => [
      {
        _id: alertId,
        _index: ecsRowData._index ?? '',
        data: [{ field: TAGS, value: ecsRowData.tags ?? [] }],
        ecs: {
          _id: alertId,
          _index: ecsRowData._index ?? '',
        },
      },
    ],
    [alertId, ecsRowData._index, ecsRowData.tags]
  );

  const scopedActions = getScopedActions(scopeId);
  const localSetEventsLoading = useCallback(
    ({ isLoading }) => {
      if (scopedActions) {
        dispatch(scopedActions.setEventsLoading({ id: scopeId, eventIds: [alertId], isLoading }));
      }
    },
    [dispatch, scopeId, scopedActions, alertId]
  );

  const { alertTagsItems, alertTagsPanels } = useBulkAlertTagsItems({ refetch });

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
          setIsBulkActionsLoading: localSetEventsLoading,
          alertItems: alertTagData,
        });
        return { title: panel.title, content, id: panel.id };
      }),
    [alertTagData, alertTagsPanels, closePopover, localSetEventsLoading]
  );

  return {
    alertTagsItems: hasIndexWrite ? itemsToReturn : [],
    alertTagsPanels: panelsToReturn,
  };
};

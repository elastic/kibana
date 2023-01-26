/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { inputsModel } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { AlertWorkflowStatus } from '../../../../common/types';
import { APM_USER_INTERACTIONS } from '../../../../common/lib/apm/constants';
import { useUpdateAlertsStatus } from '../../../../common/components/toolbar/bulk_actions/use_update_alerts';
import {
  BULK_ACTION_ACKNOWLEDGED_SELECTED,
  BULK_ACTION_CLOSE_SELECTED,
  BULK_ACTION_OPEN_SELECTED,
} from '../../../../common/components/toolbar/bulk_actions/translations';
import {
  UPDATE_ALERT_STATUS_FAILED,
  UPDATE_ALERT_STATUS_FAILED_DETAILED,
} from '../../../../common/translations';
import { FILTER_ACKNOWLEDGED, FILTER_CLOSED, FILTER_OPEN } from '../../../../../common/types';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import * as i18n from '../translations';

export const getUpdateAlertsQuery = (eventIds: Readonly<string[]>) => {
  return { bool: { filter: { terms: { _id: eventIds } } } };
};

export interface TakeActionsProps {
  currentStatus?: AlertWorkflowStatus;
  indexName: string;
  showAlertStatusActions?: boolean;
}

export const useGroupTakeActionsItems = ({
  currentStatus,
  indexName,
  showAlertStatusActions = true,
}: TakeActionsProps) => {
  const { updateAlertStatus } = useUpdateAlertsStatus();
  const { addSuccess, addError, addWarning } = useAppToasts();
  const { startTransaction } = useStartTransaction();
  const getGlobalQuerySelector = inputsSelectors.globalQuery();
  const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);
  const refetchQuery = useCallback(() => {
    globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, [globalQueries]);

  const onUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
      refetchQuery();
    },
    [refetchQuery]
  );

  const onUpdateFailure = useCallback(
    (newStatus: AlertWorkflowStatus, error: Error) => {
      refetchQuery();
    },
    [refetchQuery]
  );

  const onAlertStatusUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
      if (conflicts > 0) {
        // Partial failure
        addWarning({
          title: UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
        });
      } else {
        let title: string;
        switch (newStatus) {
          case 'closed':
            title = i18n.CLOSED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'open':
            title = i18n.OPENED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'acknowledged':
            title = i18n.ACKNOWLEDGED_ALERT_SUCCESS_TOAST(updated);
        }
        addSuccess({ title });
      }
      if (onUpdateSuccess) {
        onUpdateSuccess(updated, conflicts, newStatus);
      }
    },
    [addSuccess, addWarning, onUpdateSuccess]
  );

  const onAlertStatusUpdateFailure = useCallback(
    (newStatus: AlertWorkflowStatus, error: Error) => {
      let title: string;
      switch (newStatus) {
        case 'closed':
          title = i18n.CLOSED_ALERT_FAILED_TOAST;
          break;
        case 'open':
          title = i18n.OPENED_ALERT_FAILED_TOAST;
          break;
        case 'acknowledged':
          title = i18n.ACKNOWLEDGED_ALERT_FAILED_TOAST;
      }
      addError(error.message, { title });
      if (onUpdateFailure) {
        onUpdateFailure(newStatus, error);
      }
    },
    [addError, onUpdateFailure]
  );

  const onClickUpdate = useCallback(
    async (status: AlertWorkflowStatus, query?: string) => {
      if (query) {
        startTransaction({ name: APM_USER_INTERACTIONS.BULK_QUERY_STATUS_UPDATE });
      } else {
        startTransaction({ name: APM_USER_INTERACTIONS.STATUS_UPDATE });
      }

      try {
        const response = await updateAlertStatus({
          index: indexName,
          status,
          query: query ? JSON.parse(query) : {},
        });

        onAlertStatusUpdateSuccess(response.updated ?? 0, response.version_conflicts ?? 0, status);
      } catch (error) {
        onAlertStatusUpdateFailure(status, error);
      }
    },
    [
      updateAlertStatus,
      indexName,
      onAlertStatusUpdateSuccess,
      onAlertStatusUpdateFailure,
      startTransaction,
    ]
  );

  const items = useMemo(() => {
    const getActionItems = (query?: string) => {
      const actionItems: JSX.Element[] = [];
      if (showAlertStatusActions) {
        if (currentStatus !== FILTER_OPEN) {
          actionItems.push(
            <EuiContextMenuItem
              key="open"
              data-test-subj="open-alert-status"
              onClick={() => onClickUpdate(FILTER_OPEN as AlertWorkflowStatus, query)}
            >
              {BULK_ACTION_OPEN_SELECTED}
            </EuiContextMenuItem>
          );
        }
        if (currentStatus !== FILTER_ACKNOWLEDGED) {
          actionItems.push(
            <EuiContextMenuItem
              key="acknowledge"
              data-test-subj="acknowledged-alert-status"
              onClick={() => onClickUpdate(FILTER_ACKNOWLEDGED as AlertWorkflowStatus, query)}
            >
              {BULK_ACTION_ACKNOWLEDGED_SELECTED}
            </EuiContextMenuItem>
          );
        }
        if (currentStatus !== FILTER_CLOSED) {
          actionItems.push(
            <EuiContextMenuItem
              key="close"
              data-test-subj="close-alert-status"
              onClick={() => onClickUpdate(FILTER_CLOSED as AlertWorkflowStatus, query)}
            >
              {BULK_ACTION_CLOSE_SELECTED}
            </EuiContextMenuItem>
          );
        }
      }
      return actionItems;
    };

    return getActionItems;
  }, [currentStatus, onClickUpdate, showAlertStatusActions]);

  return items;
};

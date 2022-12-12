/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { FILTER_ACKNOWLEDGED, FILTER_CLOSED, FILTER_OPEN } from '../../../../../common/types';
import type {
  CustomBulkActionProp,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../common/types';
import * as i18n from './translations';
import { useUpdateAlertsStatus } from './use_update_alerts';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useStartTransaction } from '../../../lib/apm/use_start_transaction';
import { APM_USER_INTERACTIONS } from '../../../lib/apm/constants';
import type { AlertWorkflowStatus } from '../../../types';
import type { OnUpdateAlertStatusError, OnUpdateAlertStatusSuccess } from './types';

export const getUpdateAlertsQuery = (eventIds: Readonly<string[]>) => {
  return { bool: { filter: { terms: { _id: eventIds } } } };
};

export interface BulkActionsProps {
  eventIds: string[];
  currentStatus?: AlertWorkflowStatus;
  query?: string;
  indexName: string;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
  showAlertStatusActions?: boolean;
  onUpdateSuccess?: OnUpdateAlertStatusSuccess;
  onUpdateFailure?: OnUpdateAlertStatusError;
  customBulkActions?: CustomBulkActionProp[];
}

export const useBulkActionItems = ({
  eventIds,
  currentStatus,
  query,
  indexName,
  setEventsLoading,
  showAlertStatusActions = true,
  setEventsDeleted,
  onUpdateSuccess,
  onUpdateFailure,
  customBulkActions,
}: BulkActionsProps) => {
  const { updateAlertStatus } = useUpdateAlertsStatus();
  const { addSuccess, addError, addWarning } = useAppToasts();
  const { startTransaction } = useStartTransaction();

  const onAlertStatusUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
      if (conflicts > 0) {
        // Partial failure
        addWarning({
          title: i18n.UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: i18n.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
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
    async (status: AlertWorkflowStatus) => {
      if (query) {
        startTransaction({ name: APM_USER_INTERACTIONS.BULK_QUERY_STATUS_UPDATE });
      } else if (eventIds.length > 1) {
        startTransaction({ name: APM_USER_INTERACTIONS.BULK_STATUS_UPDATE });
      } else {
        startTransaction({ name: APM_USER_INTERACTIONS.STATUS_UPDATE });
      }

      try {
        setEventsLoading({ eventIds, isLoading: true });

        const response = await updateAlertStatus({
          index: indexName,
          status,
          query: query ? JSON.parse(query) : getUpdateAlertsQuery(eventIds),
        });

        // TODO: Only delete those that were successfully updated from updatedRules
        setEventsDeleted({ eventIds, isDeleted: true });

        if (response.version_conflicts && eventIds.length === 1) {
          throw new Error(i18n.BULK_ACTION_FAILED_SINGLE_ALERT);
        }

        onAlertStatusUpdateSuccess(response.updated ?? 0, response.version_conflicts ?? 0, status);
      } catch (error) {
        onAlertStatusUpdateFailure(status, error);
      } finally {
        setEventsLoading({ eventIds, isLoading: false });
      }
    },
    [
      setEventsLoading,
      eventIds,
      updateAlertStatus,
      indexName,
      query,
      setEventsDeleted,
      onAlertStatusUpdateSuccess,
      onAlertStatusUpdateFailure,
      startTransaction,
    ]
  );

  const items = useMemo(() => {
    const actionItems: JSX.Element[] = [];
    if (showAlertStatusActions) {
      if (currentStatus !== FILTER_OPEN) {
        actionItems.push(
          <EuiContextMenuItem
            key="open"
            data-test-subj="open-alert-status"
            onClick={() => onClickUpdate(FILTER_OPEN as AlertWorkflowStatus)}
          >
            {i18n.BULK_ACTION_OPEN_SELECTED}
          </EuiContextMenuItem>
        );
      }
      if (currentStatus !== FILTER_ACKNOWLEDGED) {
        actionItems.push(
          <EuiContextMenuItem
            key="acknowledge"
            data-test-subj="acknowledged-alert-status"
            onClick={() => onClickUpdate(FILTER_ACKNOWLEDGED as AlertWorkflowStatus)}
          >
            {i18n.BULK_ACTION_ACKNOWLEDGED_SELECTED}
          </EuiContextMenuItem>
        );
      }
      if (currentStatus !== FILTER_CLOSED) {
        actionItems.push(
          <EuiContextMenuItem
            key="close"
            data-test-subj="close-alert-status"
            onClick={() => onClickUpdate(FILTER_CLOSED as AlertWorkflowStatus)}
          >
            {i18n.BULK_ACTION_CLOSE_SELECTED}
          </EuiContextMenuItem>
        );
      }
    }

    const additionalItems = customBulkActions
      ? customBulkActions.reduce<JSX.Element[]>((acc, action) => {
          const isDisabled = !!(query && action.disableOnQuery);
          acc.push(
            <EuiContextMenuItem
              key={action.key}
              disabled={isDisabled}
              data-test-subj={action['data-test-subj']}
              toolTipContent={isDisabled ? action.disabledLabel : null}
              onClick={() => action.onClick(eventIds)}
            >
              {action.label}
            </EuiContextMenuItem>
          );
          return acc;
        }, [])
      : [];

    return [...actionItems, ...additionalItems];
  }, [currentStatus, customBulkActions, eventIds, onClickUpdate, query, showAlertStatusActions]);

  return items;
};

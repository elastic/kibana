/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { FILTER_CLOSED, FILTER_IN_PROGRESS, FILTER_OPEN } from '../../common/constants';
import * as i18n from '../components/t_grid/translations';
import type { AlertStatus } from '../../common/types/timeline';
import { useUpdateAlertsStatus } from '../container/use_update_alerts';

export interface SetEventsLoadingProps {
  eventIds: string[];
  isLoading: boolean;
}

export interface SetEventsDeletedProps {
  eventIds: string[];
  isDeleted: boolean;
}

export interface StatusBulkActionsProps {
  eventIds: string[];
  currentStatus?: AlertStatus;
  query?: string;
  setEventsLoading: (param: SetEventsLoadingProps) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  onUpdateSuccess: (updated: number, conflicts: number, status: AlertStatus) => void;
  onUpdateFailure: (status: AlertStatus, error: Error) => void;
}

export const getUpdateAlertsQuery = (eventIds: Readonly<string[]>) => {
  return { bool: { filter: { terms: { _id: eventIds } } } };
};

export const useStatusBulkActionItems = ({
  eventIds,
  currentStatus,
  query,
  setEventsLoading,
  setEventsDeleted,
  onUpdateSuccess,
  onUpdateFailure,
}: StatusBulkActionsProps) => {
  const { updateAlertStatus } = useUpdateAlertsStatus();

  const onClickUpdate = useCallback(
    async (status: AlertStatus) => {
      try {
        setEventsLoading({ eventIds, isLoading: true });

        const queryObject = query ? JSON.parse(query) : getUpdateAlertsQuery(eventIds);
        const response = await updateAlertStatus({ query: queryObject, status });
        // TODO: Only delete those that were successfully updated from updatedRules
        setEventsDeleted({ eventIds, isDeleted: true });

        if (response.version_conflicts > 0 && eventIds.length === 1) {
          throw new Error(i18n.BULK_ACTION_FAILED_SINGLE_ALERT);
        }

        onUpdateSuccess(response.updated, response.version_conflicts, status);
      } catch (error) {
        onUpdateFailure(status, error);
      } finally {
        setEventsLoading({ eventIds, isLoading: false });
      }
    },
    [
      eventIds,
      query,
      setEventsLoading,
      updateAlertStatus,
      setEventsDeleted,
      onUpdateSuccess,
      onUpdateFailure,
    ]
  );

  const items = useMemo(() => {
    const actionItems = [];
    if (currentStatus !== FILTER_OPEN) {
      actionItems.push(
        <EuiContextMenuItem key="open" onClick={() => onClickUpdate(FILTER_OPEN)}>
          {i18n.BULK_ACTION_OPEN_SELECTED}
        </EuiContextMenuItem>
      );
    }
    if (currentStatus !== FILTER_IN_PROGRESS) {
      actionItems.push(
        <EuiContextMenuItem key="progress" onClick={() => onClickUpdate(FILTER_IN_PROGRESS)}>
          {i18n.BULK_ACTION_IN_PROGRESS_SELECTED}
        </EuiContextMenuItem>
      );
    }
    if (currentStatus !== FILTER_CLOSED) {
      actionItems.push(
        <EuiContextMenuItem key="close" onClick={() => onClickUpdate(FILTER_CLOSED)}>
          {i18n.BULK_ACTION_CLOSE_SELECTED}
        </EuiContextMenuItem>
      );
    }
    return actionItems;
  }, [currentStatus, onClickUpdate]);

  return items;
};

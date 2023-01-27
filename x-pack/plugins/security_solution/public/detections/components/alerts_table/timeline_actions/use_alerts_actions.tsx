/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import type { AlertWorkflowStatus } from '../../../../common/types';
import { useBulkActionItems } from '../../../../common/components/toolbar/bulk_actions/use_bulk_action_items';
import { getScopedActions } from '../../../../helpers';
import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import type { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
interface Props {
  alertStatus?: Status;
  closePopover: () => void;
  eventId: string;
  scopeId: string;
  indexName: string;
  refetch?: () => void;
}

export const useAlertsActions = ({
  alertStatus,
  closePopover,
  eventId,
  scopeId,
  indexName,
  refetch,
}: Props) => {
  const dispatch = useDispatch();
  const { hasIndexWrite } = useAlertsPrivileges();

  const onStatusUpdate = useCallback(() => {
    closePopover();
    if (refetch) {
      refetch();
    }
  }, [closePopover, refetch]);

  const scopedActions = getScopedActions(scopeId);
  const localSetEventsLoading = useCallback(
    ({ eventIds, isLoading }: SetEventsLoadingProps) => {
      if (scopedActions) {
        dispatch(scopedActions.setEventsLoading({ id: scopeId, eventIds, isLoading }));
      }
    },
    [dispatch, scopeId, scopedActions]
  );

  const setEventsDeleted = useCallback(
    ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
      if (scopedActions) {
        dispatch(scopedActions.setEventsDeleted({ id: scopeId, eventIds, isDeleted }));
      }
    },
    [dispatch, scopeId, scopedActions]
  );

  const actionItems = useBulkActionItems({
    eventIds: [eventId],
    currentStatus: alertStatus as AlertWorkflowStatus,
    indexName,
    setEventsLoading: localSetEventsLoading,
    setEventsDeleted,
    onUpdateSuccess: onStatusUpdate,
    onUpdateFailure: onStatusUpdate,
  });

  return {
    actionItems: hasIndexWrite ? actionItems : [],
  };
};
